import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronDown, ChevronUp, Gauge, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Account, Budget, Transaction } from '@/types/finance'
import { formatCurrency } from '@/lib/calculations'
import { computeDailyBudgetAllowance } from '@/lib/dailyBudget'
import { usePlanning } from '@/hooks/usePlanning'
import { useRecurringRules } from '@/hooks/useRecurringRules'
import { cn } from '@/lib/utils'

interface DailyBudgetCardProps {
  accounts: Account[]
  transactions: Transaction[]
  budgets: Budget[]
}

/**
 * Displays the daily spendable budget for the rest of the month without touching provisions.
 */
export function DailyBudgetCard({
  accounts,
  transactions,
  budgets,
}: DailyBudgetCardProps) {
  const navigate = useNavigate()
  const { goals, savingsTimeframe, excludedNextMonthIds } = usePlanning()
  const { rules: recurringRules } = useRecurringRules()
  const [isExpanded, setIsExpanded] = useState(false)

  const metrics = useMemo(
    () =>
      computeDailyBudgetAllowance({
        accounts,
        transactions,
        budgets,
        goals: goals || [],
        recurringRules: recurringRules || [],
        savingsTimeframe,
        excludedNextMonthIds,
      }),
    [accounts, transactions, budgets, goals, recurringRules, savingsTimeframe, excludedNextMonthIds]
  )

  if (accounts.length === 0) return null

  const isNegative = metrics.dailyAllowance < 0
  const isTight = !isNegative && metrics.dailyAllowance < 15

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs tabular-nums',
        isNegative
          ? 'bg-rose-500/10 border-rose-500/30'
          : isTight
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-sky-500/10 border-sky-500/25'
      )}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs',
              isNegative ? 'bg-rose-500' : isTight ? 'bg-amber-500' : 'bg-sky-600'
            )}
          >
            <Gauge className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                ¿Cuánto puedo gastar hoy?
              </span>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 font-bold bg-background/60 border-border/50 text-muted-foreground"
              >
                {metrics.daysLeftInclusive} {metrics.daysLeftInclusive === 1 ? 'día' : 'días'} rest.
              </Badge>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={cn(
                  'text-base sm:text-lg font-black tracking-tight',
                  isNegative
                    ? 'text-rose-600 dark:text-rose-400'
                    : isTight
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-sky-700 dark:text-sky-300'
                )}
              >
                {formatCurrency(metrics.dailyAllowance)}/día
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">
                ({formatCurrency(metrics.spendableMonthMargin)} libres este mes sin tocar provisiones)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          <span className="hidden sm:inline text-xs font-bold">
            {isExpanded ? 'Ocultar' : 'Desglose'}
          </span>
          <div className="w-6 h-6 rounded-lg bg-background/60 flex items-center justify-center">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2.5 sm:px-4 border-t border-border/30 bg-background/60 space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-background/85 border border-border/40">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Cierre previsto cuentas
              </p>
              <p className="font-black text-sm mt-0.5">
                {formatCurrency(metrics.projectedMonthEndCapital)}
              </p>
              <p className="text-[10px] text-muted-foreground">Saldo actual + pendientes mes</p>
            </div>

            <div className="p-2.5 rounded-xl bg-background/85 border border-border/40">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Provisiones protegidas
              </p>
              <p className="font-black text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                -{formatCurrency(metrics.nextMonthProvision + metrics.savingsProvision)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Próx. mes ({formatCurrency(metrics.nextMonthProvision)}) + Ahorro ({formatCurrency(metrics.savingsProvision)})
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-background/85 border border-border/40">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                {metrics.hasActiveBudgets ? 'Restante en sobres' : 'Margen por asignar'}
              </p>
              <p className="font-black text-sm text-primary mt-0.5">
                {metrics.hasActiveBudgets
                  ? `${formatCurrency(metrics.envelopesDailyAllowance)}/día`
                  : formatCurrency(metrics.unallocatedMargin)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {metrics.hasActiveBudgets
                  ? `${formatCurrency(metrics.envelopesRemaining)} en sobres activos`
                  : 'Sin sobres activos este mes'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/30 flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Cálculo de solo lectura basado en tu dinero proyectado menos provisiones.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/presupuestos' })}
              className="h-7 px-2 text-xs font-bold text-primary gap-1"
            >
              <span>Ajustar en Presupuestos</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
