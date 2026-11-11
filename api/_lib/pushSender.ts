import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushSubscriptionRow } from './supabaseAdmin.js';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:notificaciones@contahogar.local';

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY (or VITE_VAPID_PUBLIC_KEY) / VAPID_PRIVATE_KEY.');
  }

  webpush.setVapidDetails(subject.trim(), publicKey.trim(), privateKey.trim());
  vapidConfigured = true;
}

/**
 * Dispatches a Web Push notification to all target subscriptions and removes
 * expired/unsubscribed endpoints (HTTP 404 or 410).
 */
export async function sendWebPushToSubscriptions(
  supabase: SupabaseClient,
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  if (subscriptions.length === 0) {
    return { sent: 0, removed: 0, failed: 0 };
  }

  ensureVapidConfigured();
  const serialized = JSON.stringify({
    ...payload,
    icon: '/favicon.png',
    badge: '/favicon.png',
  });

  let sent = 0;
  let removed = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          serialized
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
          removed += 1;
        } else {
          failed += 1;
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }

  return { sent, removed, failed };
}
