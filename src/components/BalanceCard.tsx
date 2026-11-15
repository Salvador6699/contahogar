import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Gauge,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePlanning } from '@/hooks/usePlanning';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import { formatCurrency } from '@/lib/calculations';
import { computeDailyBudgetAllowance } from '@/lib/dailyBudget';
import { cn } from '@/lib/utils';
import {
  Account,
  Budget,
  RecurringExpenseRule,
  SavingsGoal,
  Transaction,
} from '@/types/finance';

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_BUDGETS: Budget[] = [];
const EMPTY_GOALS: SavingsGoal[] = [];
const EMPTY_RULES: RecurringExpenseRule[] = [];

interface BalanceCardProps {
  balance: number;
  projectedBalance: number;
  savingsBalance?: number;
  compact?: boolean;
  selectedAccountName?: string;
  isTotalSelected?: boolean;
  isCurrentMonth?: boolean;
  accounts?: Account[];
  transactions?: Transaction[];
  budgets?: Budget[];
}

/**
 * Compact executive header card summarizing current/projected liquidity,
 * spendable allowance without touching budgets or provisions, and capital split.
 */
const BalanceCard = ({
  balance,
  projectedBalance,
  savingsBalance = 0,
  compact = false,
  selectedAccountName,
  isTotalSelected = true,
  isCurrentMonth = true,
  accounts,
  transactions,
  budgets,
}: BalanceCardProps) => {
  const navigate = useNavigate();
  const { goals, savingsTimeframe, excludedNextMonthIds } = usePlanning();
  const { rules: recurringRules } = useRecurringRules();
  const [isExpanded, setIsExpanded] = useState(false);

  const metrics = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    return computeDailyBudgetAllowance({
      accounts,
      transactions: transactions ?? EMPTY_TRANSACTIONS,
      budgets: budgets ?? EMPTY_BUDGETS,
      goals: goals ?? EMPTY_GOALS,
      recurringRules: recurringRules ?? EMPTY_RULES,
      savingsTimeframe,
      excludedNextMonthIds,
    });
  }, [
    accounts,
    transactions,
    budgets,
    goals,
    recurringRules,
    savingsTimeframe,
    excludedNextMonthIds,
  ]);

  const isPositive = balance >= 0;
  const isProjectedPositive = projectedBalance >= 0;
  const pendingDiff = Number((projectedBalance - balance).toFixed(2));
  const hasPendingTransactions = Math.abs(pendingDiff) > 0.005;

  const isNegativeAllowance = metrics ? metrics.dailyAllowance < 0 : false;
  const isTightAllowance =
    metrics !== null && !isNegativeAllowance && metrics.dailyAllowance < 15;

  const provisionsTotal = metrics
    ? Number((metrics.nextMonthProvision + metrics.savingsProvision).toFixed(2))
    : 0;

  const allocationSegments = useMemo(() => {
    if (!metrics) return [];

    const firstSegment = metrics.hasActiveBudgets
      ? {
          key: 'budgets',
          label: 'Presupuestos',
          displayValue: metrics.totalBudgets,
          barValue: Math.max(0, metrics.totalBudgets),
          colorClass: 'bg-sky-300',
        }
      : {
          key: 'pending',
          label: 'Pendientes',
          displayValue: Math.max(
            0,
            Number((metrics.realBalance - metrics.projectedMonthEndCapital).toFixed(2))
          ),
          barValue: Math.max(0, metrics.realBalance - metrics.projectedMonthEndCapital),
          colorClass: 'bg-sky-300',
        };

    return [
      firstSegment,
      {
        key: 'provisions',
        label: 'Provisiones',
        displayValue: provisionsTotal,
        barValue: Math.max(0, provisionsTotal),
        colorClass: 'bg-amber-300',
      },
      {
        key: 'free',
        label: 'Libre',
        displayValue: metrics.spendableMonthMargin,
        barValue: Math.max(0, metrics.spendableMonthMargin),
        colorClass: 'bg-emerald-300',
      },
    ];
  }, [metrics, provisionsTotal]);

  const segmentTotal = allocationSegments.reduce((sum, seg) => sum + seg.barValue, 0);

  return (
    <Card
      className={cn(
        'bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground shadow-lg border border-white/15 overflow-hidden relative group tabular-nums',
        compact ? 'p-3.5 sm:p-5 rounded-[24px]' : 'p-4 sm:p-6 rounded-[28px]'
      )}
    >
      <div
        className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute -top-6 -right-6 p-4 opacity-10 pointer-events-none">
        <TrendingUp className="w-40 h-40 transform rotate-12 text-white" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Main Executive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-5 items-stretch">
          {/* Left Column: Current & Projected Liquidity */}
          <div className="md:col-span-7 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-white/80">
                {isTotalSelected
                  ? 'Saldo Disponible Hoy'
                  : `Saldo en ${selectedAccountName || 'Cuenta'}`}
              </span>

              {isTotalSelected && Math.abs(savingsBalance) > 0.005 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-0.5 text-[10px] font-bold text-white/90 border border-white/15">
                  <PiggyBank className="w-3 h-3 text-emerald-200 shrink-0" />
                  <span>Ahorro: {formatCurrency(savingsBalance)}</span>
                  <span className="text-white/40">·</span>
                  <span>Patrimonio: {formatCurrency(balance + savingsBalance)}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className={cn(
                  'text-3xl sm:text-4xl font-black tracking-tight drop-shadow-xs',
                  !isPositive ? 'text-red-200' : 'text-white'
                )}
              >
                {formatCurrency(balance)}
              </p>

              <div className="bg-black/15 backdrop-blur-xs rounded-2xl px-3.5 py-2 border border-white/10 flex flex-col justify-center min-w-[175px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                  Saldo Previsto (Futuros)
                </span>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span
                    className={cn(
                      'text-lg sm:text-xl font-black leading-none',
                      !isProjectedPositive ? 'text-red-200' : 'text-white'
                    )}
                  >
                    {formatCurrency(projectedBalance)}
                  </span>

                  {hasPendingTransactions ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                        pendingDiff > 0
                          ? 'bg-emerald-400/20 text-emerald-100'
                          : 'bg-rose-400/20 text-rose-100'
                      )}
                    >
                      {pendingDiff > 0 ? (
                        <TrendingUp className="w-3 h-3 shrink-0" />
                      ) : (
                        <TrendingDown className="w-3 h-3 shrink-0" />
                      )}
                      <span>
                        {pendingDiff > 0 ? '+' : ''}
                        {formatCurrency(pendingDiff)} pendientes
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/10 text-white/75">
                      Sin pendientes
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Spendable Margin & Daily Allowance (or Non-current month summary) */}
          <div className="md:col-span-5">
            {isCurrentMonth && metrics ? (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-full h-full text-left bg-white/12 hover:bg-white/16 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 transition-colors cursor-pointer flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Gauge className="w-4 h-4 text-white/90 shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/85 truncate">
                      Libre para gastar
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 font-bold bg-black/20 border-white/20 text-white shrink-0"
                  >
                    {metrics.daysLeftInclusive}{' '}
                    {metrics.daysLeftInclusive === 1 ? 'día' : 'días'} rest.
                  </Badge>
                </div>

                <p
                  className={cn(
                    'text-2xl sm:text-3xl font-black tracking-tight leading-tight',
                    isNegativeAllowance
                      ? 'text-red-200'
                      : isTightAllowance
                        ? 'text-amber-200'
                        : 'text-emerald-200'
                  )}
                >
                  {formatCurrency(metrics.dailyAllowance)}/día
                </p>

                <p className="text-xs text-white/85 leading-snug">
                  <strong className="font-black text-white">
                    {formatCurrency(metrics.spendableMonthMargin)} libres
                  </strong>{' '}
                  {metrics.hasActiveBudgets
                    ? 'sin tocar presupuestos ni provisiones'
                    : 'sin tocar provisiones'}
                </p>
              </button>
            ) : (
              <div className="h-full bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col justify-center gap-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">
                  Variación pendiente del mes
                </span>
                <p
                  className={cn(
                    'text-2xl font-black tracking-tight',
                    pendingDiff < 0 ? 'text-rose-200' : 'text-white'
                  )}
                >
                  {hasPendingTransactions
                    ? `${pendingDiff > 0 ? '+' : ''}${formatCurrency(pendingDiff)}`
                    : formatCurrency(0)}
                </p>
                <p className="text-xs text-white/75 leading-snug">
                  {hasPendingTransactions
                    ? 'Impacto neto de movimientos futuros en este mes'
                    : 'Sin movimientos pendientes en este mes'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Distribution Bar + Expandable Breakdown */}
        {isCurrentMonth && metrics && (
          <div className="mt-3.5 pt-3 border-t border-white/15">
            <div className="h-2 w-full rounded-full bg-black/25 overflow-hidden flex gap-0.5">
              {segmentTotal > 0 &&
                allocationSegments.map((seg) =>
                  seg.barValue > 0 ? (
                    <div
                      key={seg.key}
                      className={cn(
                        'h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full',
                        seg.colorClass
                      )}
                      style={{ width: `${(seg.barValue / segmentTotal) * 100}%` }}
                      title={`${seg.label}: ${formatCurrency(seg.displayValue)}`}
                    />
                  ) : null
                )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-x-3.5 gap-y-1 flex-wrap text-[11px] font-semibold text-white/90">
                {allocationSegments.map((seg) => (
                  <span key={seg.key} className="inline-flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', seg.colorClass)} />
                    <span className="text-white/75">{seg.label}:</span>
                    <span className={cn('font-bold', seg.displayValue < 0 && 'text-red-200')}>
                      {formatCurrency(seg.displayValue)}
                    </span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full bg-white/12 hover:bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer shrink-0"
              >
                <span>{isExpanded ? 'Ocultar' : 'Desglose'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/15 space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/10">
                    <p className="text-[10px] font-bold uppercase text-white/75">
                      Capital del mes
                    </p>
                    <p className="font-black text-sm text-white mt-0.5">
                      {formatCurrency(
                        metrics.hasActiveBudgets
                          ? metrics.grossMonthCapital
                          : metrics.projectedMonthEndCapital
                      )}
                    </p>
                    <p className="text-[10px] text-white/70">
                      {metrics.hasActiveBudgets
                        ? `Saldo actual: ${formatCurrency(metrics.realBalance)}`
                        : 'Saldo actual + pendientes mes'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/10">
                    <p className="text-[10px] font-bold uppercase text-white/75">
                      Asignado en presupuestos
                    </p>
                    <p className="font-black text-sm text-sky-200 mt-0.5">
                      {metrics.hasActiveBudgets
                        ? `-${formatCurrency(metrics.totalBudgets)}`
                        : formatCurrency(0)}
                    </p>
                    <p className="text-[10px] text-white/70">
                      {metrics.hasActiveBudgets
                        ? `Quedan ${formatCurrency(metrics.envelopesRemaining)} en sobres (${formatCurrency(metrics.envelopesDailyAllowance)}/día)`
                        : 'Sin sobres activos este mes'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/10">
                    <p className="text-[10px] font-bold uppercase text-white/75">
                      Provisiones protegidas
                    </p>
                    <p className="font-black text-sm text-amber-200 mt-0.5">
                      -{formatCurrency(provisionsTotal)}
                    </p>
                    <p className="text-[10px] text-white/70">
                      Próx. mes ({formatCurrency(metrics.nextMonthProvision)}) + Ahorro (
                      {formatCurrency(metrics.savingsProvision)})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/10 flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    Cálculo global del mes (cuentas operativas): capital menos presupuestos y
                    provisiones.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/presupuestos' })}
                    className="h-7 px-2.5 text-xs font-bold text-white hover:bg-white/15 hover:text-white gap-1"
                  >
                    <span>Ajustar en Presupuestos</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default BalanceCard;
