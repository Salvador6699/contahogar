import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Landmark,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Account, Transaction } from '@/types/finance';
import {
  calculateAccountMonthlyCoverage,
  formatCurrency,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface AccountCoverageWidgetProps {
  accounts: Account[];
  transactions: Transaction[];
  monthKey: string;
  selectedAccount: string | 'total';
  onSelectAccount: (accountId: string) => void;
}

/**
 * Collapsible summary panel comparing monthly incomes vs fixed/pending
 * expenses side-by-side for each non-linked account.
 */
export function AccountCoverageWidget({
  accounts,
  transactions,
  monthKey,
  selectedAccount,
  onSelectAccount,
}: AccountCoverageWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const summaries = useMemo(
    () => calculateAccountMonthlyCoverage(accounts, transactions, monthKey),
    [accounts, transactions, monthKey]
  );

  if (summaries.length === 0) return null;

  const monthLabel = format(parseISO(`${monthKey}-01`), 'MMMM', { locale: es });

  const uncoveredAccounts = summaries.filter(
    (s) => !s.excludeFromTotals && s.fixedExpenses > 0 && s.marginAfterFixed < -0.005
  );

  const totalMarginAfterFixed = summaries
    .filter((s) => !s.excludeFromTotals)
    .reduce((sum, s) => sum + s.marginAfterFixed, 0);

  const hasWarning = uncoveredAccounts.length > 0;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs',
        hasWarning
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-primary/5 border-primary/20'
      )}
    >
      {/* Compact Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs',
              hasWarning ? 'bg-amber-500' : 'bg-primary'
            )}
          >
            {hasWarning ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Landmark className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0 text-xs sm:text-sm">
            <span className="font-bold text-foreground tracking-tight">
              Cobertura por cuenta{' '}
              <span className="capitalize text-muted-foreground font-semibold">
                ({monthLabel})
              </span>
            </span>

            {hasWarning ? (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold text-[10px] px-1.5 py-0"
              >
                {uncoveredAccounts.length === 1
                  ? `${uncoveredAccounts[0].accountName}: fijos superan ingresos (${formatCurrency(uncoveredAccounts[0].marginAfterFixed)})`
                  : `${uncoveredAccounts.length} cuentas con fijos > ingresos`}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 font-bold text-[10px] px-1.5 py-0 inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Margen tras fijos: {formatCurrency(totalMarginAfterFixed)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          <span className="hidden sm:inline text-[11px] font-semibold">
            {isExpanded ? 'Ocultar' : 'Ver cuentas'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Expanded Per-Account Grid */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1.5 sm:px-3.5 border-t border-border/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {summaries.map((item) => {
              const isSelected = selectedAccount === item.accountId;
              const isDeficitFixed = item.fixedExpenses > 0 && item.marginAfterFixed < -0.005;
              const barWidth = Math.min(100, Math.max(0, item.fixedRatioPercent));

              return (
                <div
                  key={item.accountId}
                  onClick={() => onSelectAccount(item.accountId)}
                  className={cn(
                    'p-3 rounded-xl bg-background/85 border transition-colors cursor-pointer space-y-2',
                    isSelected
                      ? 'border-primary/60 ring-1 ring-primary/30'
                      : 'border-border/40 hover:border-primary/30'
                  )}
                >
                  {/* Account Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.accountLogo && (
                        <img
                          src={item.accountLogo}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover shrink-0 bg-white"
                        />
                      )}
                      <span className="text-xs font-black uppercase tracking-wider truncate">
                        {item.accountName}
                      </span>
                      {item.excludeFromTotals && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 font-bold"
                        >
                          Excluida
                        </Badge>
                      )}
                    </div>

                    <span
                      className={cn(
                        'text-xs font-black tabular-nums shrink-0',
                        isDeficitFixed
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {item.marginAfterFixed >= 0 ? '+' : ''}
                      {formatCurrency(item.marginAfterFixed)} tras fijos
                    </span>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isDeficitFixed
                            ? 'bg-rose-500'
                            : item.fixedRatioPercent >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Ingresos mes
                      </p>
                      <p className="font-bold text-income tabular-nums">
                        +{formatCurrency(item.totalIncome)}
                      </p>
                      {item.pendingIncome > 0 && (
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          Pend: {formatCurrency(item.pendingIncome)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Fijos / Pend.
                      </p>
                      <p className="font-bold text-expense tabular-nums">
                        {item.fixedExpenses > 0 ? '-' : ''}
                        {formatCurrency(item.fixedExpenses)}
                      </p>
                      {item.fixedPending > 0 && (
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          Faltan: {formatCurrency(item.fixedPending)}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        Prev. cierre
                      </p>
                      <p
                        className={cn(
                          'font-bold tabular-nums',
                          item.projectedBalance < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-foreground'
                        )}
                      >
                        {formatCurrency(item.projectedBalance)}
                      </p>
                      {item.totalIncome > 0 && (
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          {item.fixedRatioPercent}% fijos
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional footer if variable expenses or transfers exist */}
                  {(item.variableExpenses > 0 || Math.abs(item.netTransfers) > 0.005) && (
                    <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-2 text-[10px] text-muted-foreground tabular-nums">
                      <span>
                        {item.variableExpenses > 0
                          ? `Variables: -${formatCurrency(item.variableExpenses)}`
                          : 'Sin gastos variables'}
                      </span>
                      {Math.abs(item.netTransfers) > 0.005 && (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          Traspasos: {item.netTransfers > 0 ? '+' : ''}
                          {formatCurrency(item.netTransfers)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
