import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendWebPushToSubscriptions } from '../_lib/pushSender';
import { createSupabaseAdmin, PushSubscriptionRow } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';

  if (!endpoint && !deviceId) {
    return res.status(400).json({ error: 'Se requiere endpoint o deviceId para enviar la prueba.' });
  }

  try {
    const supabase = createSupabaseAdmin();
    let query = supabase.from('push_subscriptions').select('*').eq('app', 'contahogar');

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error buscando suscripción: ${error.message}`);
    }

    const subscriptions = (data || []) as PushSubscriptionRow[];
    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No se encontró ninguna suscripción activa para este dispositivo.' });
    }

    const dispatch = await sendWebPushToSubscriptions(supabase, subscriptions, {
      title: '🔔 Notificaciones activadas',
      body: 'ContaHogar te avisará de vencimientos, descubiertos, préstamos, presupuestos y metas.',
      url: '/ajustes?tab=notificaciones',
      tag: 'contahogar-test',
    });

    if (dispatch.sent === 0) {
      return res.status(502).json({
        error: 'El servicio push del navegador rechazó la entrega.',
        ...dispatch,
      });
    }

    return res.status(200).json({ ok: true, ...dispatch });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error enviando notificación de prueba';
    return res.status(500).json({ error: message });
  }
}
