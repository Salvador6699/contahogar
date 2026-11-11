import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Send, Smartphone, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { appToast as toast } from '@/lib/swal';
import {
  dismissPushBanner,
  getPushStatus,
  isPushBannerDismissed,
  PushStatus,
  sendTestPushNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';

const ALERT_TYPES_SUMMARY = [
  {
    title: 'Vencimientos próximos (2 días antes)',
    description: 'Resumen agrupado con los movimientos pendientes que vencen en 48 horas.',
  },
  {
    title: 'Alerta de descubierto intrames',
    description: 'Aviso si alguna cuenta puede quedar en negativo dentro de los próximos 5 días.',
  },
  {
    title: 'Cuotas de préstamos (3 días antes)',
    description: 'Recordatorio previo al cobro de la siguiente cuota pendiente.',
  },
  {
    title: 'Control de presupuestos (80% y >100%)',
    description: 'Aviso único al alcanzar el 80% o superar el límite mensual de una categoría.',
  },
  {
    title: 'Resumen mensual (día 1 a las 10:00)',
    description: 'Balance cerrado del mes anterior con ingresos, gastos y categoría principal.',
  },
  {
    title: 'Meta de ahorro cubierta (100%)',
    description: 'Confirmación cuando el capital en tus cuentas de ahorro cubre al 100% una meta o provisión.',
  },
];

/**
 * Compact dismissible banner prompting the user to enable Web Push notifications
 * (or install the PWA on iOS Safari before enabling).
 */
export function PushPermissionBanner() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [dismissed, setDismissed] = useState(() => isPushBannerDismissed());
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getPushStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (dismissed || !status || !status.hasVapidKey) return null;
  if (status.subscribed || status.permission === 'denied') return null;
  if (!status.supported && !status.needsIosInstall) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      toast.success('Notificaciones activadas en este dispositivo');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron activar las notificaciones');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    dismissPushBanner();
    setDismissed(true);
  };

  return (
    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          {status.needsIosInstall ? <Smartphone className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            {status.needsIosInstall
              ? 'Instala ContaHogar para recibir alertas en iOS'
              : 'Activa las notificaciones push'}
          </p>
          <p className="text-xs text-muted-foreground">
            {status.needsIosInstall
              ? 'En iPhone/iPad pulsa Compartir → "Añadir a pantalla de inicio" y abre la app instalada para activar avisos.'
              : 'Recibe avisos de vencimientos, posibles descubiertos, préstamos, presupuestos y metas de ahorro.'}
          </p>
          {!status.needsIosInstall && (
            <div className="pt-1">
              <Button size="sm" onClick={handleEnable} disabled={busy} className="h-8 rounded-xl text-xs">
                {busy ? 'Activando...' : 'Activar ahora'}
              </Button>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Ocultar aviso"
        className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Full Web Push settings card for SettingsPage, allowing toggle, test dispatch,
 * iOS PWA guidance, and overview of enabled alert rules.
 */
export function PushSettingsCard() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getPushStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async (checked: boolean) => {
    setBusy(true);
    try {
      if (checked) {
        await subscribeToPush();
        toast.success('Suscripción push activada');
      } else {
        await unsubscribeFromPush();
        toast.success('Notificaciones desactivadas en este dispositivo');
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar las notificaciones');
    } finally {
      setBusy(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      await sendTestPushNotification();
      toast.success('Notificación de prueba enviada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la prueba');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {status?.subscribed ? (
              <BellRing className="w-5 h-5 text-primary" />
            ) : (
              <Bell className="w-5 h-5 text-muted-foreground" />
            )}
            Notificaciones Push en este dispositivo
          </CardTitle>
          <CardDescription>
            Gestiona los avisos automáticos diarios en tu móvil o navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status ? (
            <p className="text-sm text-muted-foreground">Comprobando estado de notificaciones...</p>
          ) : (
            <>
              {!status.hasVapidKey && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Falta la variable <code className="font-mono font-semibold">VITE_VAPID_PUBLIC_KEY</code> en el entorno para poder suscribir este dispositivo.
                  </span>
                </div>
              )}

              {status.needsIosInstall && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    En iOS es necesario pulsar <strong>Compartir → Añadir a pantalla de inicio</strong> y abrir ContaHogar desde el icono instalado para habilitar notificaciones push.
                  </span>
                </div>
              )}

              {status.permission === 'denied' && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    El permiso de notificaciones está bloqueado en este navegador. Debes habilitarlo desde los ajustes del sitio en tu navegador o sistema.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {status.subscribed ? 'Notificaciones activas' : 'Activar notificaciones'}
                    </span>
                    {status.subscribed && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {!status.supported
                      ? 'Este navegador o contexto no soporta Web Push.'
                      : status.subscribed
                        ? 'Este dispositivo recibirá los avisos diarios configurados.'
                        : 'Activa el interruptor para registrar este dispositivo.'}
                  </p>
                </div>
                <Switch
                  checked={status.subscribed}
                  onCheckedChange={handleToggle}
                  disabled={
                    busy ||
                    !status.supported ||
                    !status.hasVapidKey ||
                    status.needsIosInstall ||
                    status.permission === 'denied'
                  }
                />
              </div>

              {status.subscribed && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Comprueba que las alertas llegan correctamente a este dispositivo.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTest}
                    disabled={testing}
                    className="rounded-xl gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testing ? 'Enviando...' : 'Enviar notificación de prueba'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avisos incluidos</CardTitle>
          <CardDescription>
            Comprobación diaria automática sin duplicados por evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {ALERT_TYPES_SUMMARY.map((item) => (
            <div key={item.title} className="rounded-2xl border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-bold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
