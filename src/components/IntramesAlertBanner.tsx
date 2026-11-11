import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IntramesDeficitAlert, formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface IntramesAlertBannerProps {
  alerts: IntramesDeficitAlert[];
  selectedAccount: string | 'total';
  onSelectAccount: (accountId: string) => void;
}

/**
 * Displays a compact expandable alert when pending transactions cause
 * an intermediate negative balance on one or more accounts during the month.
 */
export function IntramesAlertBanner({
  alerts,
  selectedAccount,
  onSelectAccount,
}: IntramesAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleAlerts =
    selectedAccount === 'total'
      ? alerts
      : alerts.filter((a) => a.accountId === selectedAccount);

  if (visibleAlerts.length === 0) return null;

  const hasUnrecovered = visibleAlerts.some((a) => !a.recoversByMonthEnd);
  const primary = visibleAlerts[0];

  const formatShortDate = (isoDate: string) =>
    format(parseISO(isoDate), 'd MMM', { locale: es });

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs',
        hasUnrecovered
          ? 'bg-rose-500/10 border-rose-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      )}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs',
              hasUnrecovered ? 'bg-rose-500' : 'bg-amber-500'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0 text-xs sm:text-sm">
            {visibleAlerts.length === 1 ? (
              <>
                <span
                  className={cn(
                    'font-extrabold tracking-tight',
                    hasUnrecovered
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400'
                  )}
                >
                  Descubierto el {formatShortDate(primary.firstDeficitDate)} en{' '}
                  {primary.accountName}: {formatCurrency(primary.minBalance)}
                </span>
                {primary.recoversByMonthEnd && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold text-[10px] px-1.5 py-0"
                  >
                    Fin de mes: {formatCurrency(primary.projectedBalance)}
                  </Badge>
                )}
              </>
            ) : (
              <span
                className={cn(
                  'font-extrabold tracking-tight',
                  hasUnrecovered
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-700 dark:text-amber-400'
                )}
              >
                {visibleAlerts.length} cuentas con descubierto intrames previsto
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          <span className="hidden sm:inline text-[11px] font-semibold">
            {isExpanded ? 'Ocultar' : 'Ver fechas'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 sm:px-3.5 space-y-2 border-t border-border/20">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.accountId}
              className="p-2.5 rounded-xl bg-background/80 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedAccount === 'total' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAccount(alert.accountId);
                      }}
                      className="text-xs font-black uppercase tracking-wider text-primary hover:underline"
                    >
                      {alert.accountName}
                    </button>
                  ) : (
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      {alert.accountName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Primer rojo: {formatShortDate(alert.firstDeficitDate)} (
                    {formatCurrency(alert.firstDeficitBalance)})
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground truncate">
                  Cargo{alert.triggerDescriptions.length > 1 ? 's' : ''}:{' '}
                  <span className="font-semibold text-foreground">
                    {alert.triggerDescriptions.join(', ')}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0 text-right">
                <span
                  className={cn(
                    'text-xs font-black tabular-nums',
                    alert.recoversByMonthEnd
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  Mínimo {formatCurrency(alert.minBalance)} ({formatShortDate(alert.minBalanceDate)})
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                  Cierre previsto: {formatCurrency(alert.projectedBalance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
