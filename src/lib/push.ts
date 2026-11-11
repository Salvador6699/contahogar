import { supabase } from '@/lib/supabase';

const APP_ID = 'contahogar';
const DEVICE_ID_STORAGE_KEY = 'contahogar_push_device_id';
const PUSH_BANNER_DISMISSED_KEY = 'contahogar_push_banner_dismissed';

export interface PushStatus {
  supported: boolean;
  hasVapidKey: boolean;
  isIosDevice: boolean;
  isStandalone: boolean;
  needsIosInstall: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  endpoint: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}

export function isPushBannerDismissed(): boolean {
  return localStorage.getItem(PUSH_BANNER_DISMISSED_KEY) === '1';
}

export function dismissPushBanner(): void {
  localStorage.setItem(PUSH_BANNER_DISMISSED_KEY, '1');
}

async function getActiveRegistration(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export async function getPushStatus(): Promise<PushStatus> {
  const ios = isIosDevice();
  const standalone = isStandaloneMode();
  const hasVapidKey = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const supported = isPushSupported();

  if (!supported) {
    return {
      supported: false,
      hasVapidKey,
      isIosDevice: ios,
      isStandalone: standalone,
      needsIosInstall: ios && !standalone,
      permission: 'unsupported',
      subscribed: false,
      endpoint: null,
    };
  }

  let endpoint: string | null = null;
  try {
    const reg = await getActiveRegistration(1500);
    const sub = await reg?.pushManager.getSubscription();
    endpoint = sub?.endpoint ?? null;
  } catch {
    endpoint = null;
  }

  return {
    supported: true,
    hasVapidKey,
    isIosDevice: ios,
    isStandalone: standalone,
    needsIosInstall: ios && !standalone,
    permission: Notification.permission,
    subscribed: Boolean(endpoint),
    endpoint,
  };
}

export async function subscribeToPush(): Promise<{ endpoint: string }> {
  if (!isPushSupported()) {
    throw new Error('Este navegador no soporta notificaciones push.');
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) {
    throw new Error('Falta configurar VITE_VAPID_PUBLIC_KEY en las variables de entorno.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado.');
  }

  const registration = await getActiveRegistration(6000);
  if (!registration) {
    throw new Error('El Service Worker aún no está activo (requiere build de producción o HTTPS).');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.trim()),
    });
  }

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('La suscripción push del navegador no devolvió claves válidas.');
  }

  const deviceId = getOrCreateDeviceId();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      device_id: deviceId,
      app: APP_ID,
      endpoint: json.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    throw new Error(`No se pudo guardar la suscripción en Supabase: ${error.message}`);
  }

  return { endpoint: json.endpoint };
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await getActiveRegistration(2500);
  const sub = await reg?.pushManager.getSubscription();
  const endpoint = sub?.endpoint;

  if (sub) {
    await sub.unsubscribe();
  }

  if (endpoint) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      throw new Error(`Error al eliminar suscripción: ${error.message}`);
    }
  }
}

export async function sendTestPushNotification(): Promise<{ sent: number }> {
  const status = await getPushStatus();
  if (!status.endpoint) {
    throw new Error('Activa primero las notificaciones en este dispositivo.');
  }

  const deviceId = getOrCreateDeviceId();
  const postTest = async (endpoint: string) =>
    fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, deviceId }),
    });

  let res = await postTest(status.endpoint);

  // If the push service returned 404/410 (stale/missing subscription), renew once automatically.
  if ((res.status === 404 || res.status === 410) && Notification.permission === 'granted') {
    await unsubscribeFromPush();
    const renewed = await subscribeToPush();
    res = await postTest(renewed.endpoint);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status} al enviar la prueba`);
  }

  return { sent: data.sent ?? 1 };
}
