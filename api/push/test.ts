import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendWebPushToSubscriptions } from '../_lib/pushSender.js';
import { createSupabaseAdmin, PushSubscriptionRow } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody: unknown = req.body;
  if (typeof rawBody === 'string') {
    try {
      rawBody = JSON.parse(rawBody);
    } catch {
      rawBody = {};
    }
  }
  const body = typeof rawBody === 'object' && rawBody !== null ? (rawBody as Record<string, unknown>) : {};
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
      const httpStatus = dispatch.removed > 0 ? 410 : 502;
      return res.status(httpStatus).json({
        error:
          dispatch.removed > 0
            ? 'La suscripción de este navegador había caducado.'
            : `El servicio push del navegador rechazó la entrega (${dispatch.lastError || 'error desconocido'}).`,
        ...dispatch,
      });
    }

    return res.status(200).json({ ok: true, ...dispatch });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error enviando notificación de prueba';
    return res.status(500).json({ error: message });
  }
}
