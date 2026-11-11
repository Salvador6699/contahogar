import type { VercelRequest, VercelResponse } from '@vercel/node';
import { evaluateNotificationCandidates } from '../_lib/notificationRules.js';
import { sendWebPushToSubscriptions } from '../_lib/pushSender.js';
import { createSupabaseAdmin, fetchNotificationSnapshot } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';

  try {
    const supabase = createSupabaseAdmin();
    const snapshot = await fetchNotificationSnapshot(supabase);

    const candidates = evaluateNotificationCandidates({
      accounts: snapshot.accounts,
      transactions: snapshot.transactions,
      budgets: snapshot.budgets,
      savingsGoals: snapshot.savingsGoals,
      recurringRules: snapshot.recurringRules,
    });

    if (candidates.length === 0) {
      return res.status(200).json({
        ok: true,
        dryRun,
        subscriptions: snapshot.subscriptions.length,
        candidates: 0,
        sentNotifications: 0,
      });
    }

    const dedupKeys = candidates.map((c) => c.dedupKey);
    const { data: existingLogs, error: logsError } = await supabase
      .from('push_logs')
      .select('dedup_key')
      .in('dedup_key', dedupKeys);

    if (logsError) {
      throw new Error(`Error reading push_logs: ${logsError.message}`);
    }

    const alreadySent = new Set((existingLogs || []).map((row) => row.dedup_key as string));
    const pendingToSend = candidates.filter((c) => !alreadySent.has(c.dedupKey));

    if (dryRun || snapshot.subscriptions.length === 0) {
      return res.status(200).json({
        ok: true,
        dryRun,
        subscriptions: snapshot.subscriptions.length,
        candidates: candidates.length,
        pending: pendingToSend.length,
        preview: pendingToSend.map((c) => ({
          type: c.type,
          dedupKey: c.dedupKey,
          title: c.title,
          body: c.body,
          url: c.url,
        })),
      });
    }

    const results = [];
    let sentNotifications = 0;

    for (const item of pendingToSend) {
      const dispatch = await sendWebPushToSubscriptions(supabase, snapshot.subscriptions, {
        title: item.title,
        body: item.body,
        url: item.url,
        tag: item.tag,
      });

      if (dispatch.sent > 0) {
        await supabase.from('push_logs').upsert(
          {
            dedup_key: item.dedupKey,
            app: 'contahogar',
            notification_type: item.type,
            title: item.title,
            body: item.body,
            url: item.url,
            sent_count: dispatch.sent,
          },
          { onConflict: 'dedup_key' }
        );
        sentNotifications += 1;
      }

      results.push({
        type: item.type,
        dedupKey: item.dedupKey,
        ...dispatch,
      });
    }

    return res.status(200).json({
      ok: true,
      subscriptions: snapshot.subscriptions.length,
      candidates: candidates.length,
      sentNotifications,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected push cron error';
    return res.status(500).json({ error: message });
  }
}
