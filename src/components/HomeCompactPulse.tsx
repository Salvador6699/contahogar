import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Landmark,
  Scale,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Account, Budget, Category, Transaction } from '@/types/finance'
import {
  calculateAccountMonthlyCoverage,
  formatCurrency,
  IntramesDeficitAlert,
} from '@/lib/calculations'
import { computeHomeBudgetAnalysis, computeHomeDiagnosis } from '@/lib/homePulse'
import { usePlanning } from '@/hooks/usePlanning'
import { useRecurringRules } from '@/hooks/useRecurringRules'
import { cn } from '@/lib/utils'

type PulseTab = 'intrames' | 'budgets' | 'coverage' | 'diagnosis'
type Severity = 'critical' | 'warning' | 'healthy'

interface HomeCompactPulseProps {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  accounts: Account[]
  intramesAlerts: IntramesDeficitAlert[]
  monthKey: string
  isCurrentMonth: boolean
  selectedAccount: string | 'total'
  onSelectAccount: (accountId: string) => void
}

const SEVERITY_DOT: Record<Severity | 'muted', string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  healthy: 'bg-emerald-500',
  muted: 'bg-muted-foreground/40',
}

/**
 * Unified collapsible health summary for the home dashboard.
 * Combines Intrames alerts, Budgets, Account Coverage, and Monthly Pace into a single card.
 */
export function HomeCompactPulse({
  transactions,
  categories,
  budgets,
  accounts,
  intramesAlerts,
  monthKey,
  isCurrentMonth,
  selectedAccount,
  onSelectAccount,
}: HomeCompactPulseProps) {
  const navigate = useNavigate()
  const { goals, savingsTimeframe, excludedNextMonthIds } = usePlanning()
  const { rules: recurringRules } = useRecurringRules()

  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<PulseTab>('coverage')

  const visibleIntrames = useMemo(
    () =>
      selectedAccount === 'total'
        ? intramesAlerts
        : intramesAlerts.filter((a) => a.accountId === selectedAccount),
    [intramesAlerts, selectedAccount]
  )

  const coverageSummaries = useMemo(
    () => calculateAccountMonthlyCoverage(accounts, transactions, monthKey),
    [accounts, transactions, monthKey]
  )

  const budgetAnalysis = useMemo(
    () =>
      isCurrentMonth
        ? computeHomeBudgetAnalysis({
            transactions,
            budgets,
            accounts,
            goals: goals || [],
            recurringRules: recurringRules || [],
            savingsTimeframe,
            excludedNextMonthIds,
          })
        : null,
    [
      isCurrentMonth,
      transactions,
      budgets,
      accounts,
      goals,
      recurringRules,
      savingsTimeframe,
      excludedNextMonthIds,
    ]
  )

  const diagnosis = useMemo(
    () => (isCurrentMonth ? computeHomeDiagnosis(transactions, categories) : null),
    [isCurrentMonth, transactions, categories]
  )

  const monthLabel = format(parseISO(`${monthKey}-01`), 'MMMM', { locale: es })

  const uncoveredAccounts = useMemo(
    () =>
      coverageSummaries.filter(
        (s) => !s.excludeFromTotals && s.fixedExpenses > 0 && s.marginAfterFixed < -0.005
      ),
    [coverageSummaries]
  )

  const totalMarginAfterFixed = useMemo(
    () =>
      coverageSummaries
        .filter((s) => !s.excludeFromTotals)
        .reduce((sum, s) => sum + s.marginAfterFixed, 0),
    [coverageSummaries]
  )

  const intramesSeverity: Severity = useMemo(() => {
    if (visibleIntrames.length === 0) return 'healthy'
    return visibleIntrames.some((a) => !a.recoversByMonthEnd) ? 'critical' : 'warning'
  }, [visibleIntrames])

  const coverageSeverity: Severity = uncoveredAccounts.length > 0 ? 'warning' : 'healthy'

  const budgetSeverity: Severity | 'muted' = useMemo(() => {
    if (!budgetAnalysis) return 'muted'
    if (!budgetAnalysis.hasBudgets && budgetAnalysis.nextMonthBudgetsTotal === 0) return 'muted'
    if (budgetAnalysis.hasDeficit || budgetAnalysis.hasOverbudget) return 'critical'
    return 'healthy'
  }, [budgetAnalysis])

  const diagnosisSeverity: Severity = useMemo(() => {
    if (!diagnosis) return 'healthy'
    const isOverspending = diagnosis.fullMonthDiff > 0
    if (!isOverspending) return 'healthy'
    if (diagnosis.fullMonthPercent === null || diagnosis.fullMonthPercent >= 15) return 'warning'
    return 'warning'
  }, [diagnosis])

  const overall = useMemo((): {
    severity: Severity
    headline: string
    defaultTab: PulseTab
  } => {
    if (intramesSeverity === 'critical') {
      const primary = visibleIntrames[0]
      return {
        severity: 'critical',
        headline:
          visibleIntrames.length === 1
            ? `Descubierto en ${primary.accountName}: ${formatCurrency(primary.minBalance)}`
            : `${visibleIntrames.length} cuentas con descubierto sin recuperar`,
        defaultTab: 'intrames',
      }
    }
    if (budgetAnalysis?.hasDeficit) {
      return {
        severity: 'critical',
        headline: `Déficit de asignación: ${formatCurrency(budgetAnalysis.disponibleParaAsignar)}`,
        defaultTab: 'budgets',
      }
    }
    if (budgetAnalysis?.hasOverbudget) {
      const first = budgetAnalysis.overbudgetEnvelopes[0]
      return {
        severity: 'critical',
        headline: `${first.category} excedido en +${formatCurrency(Math.abs(first.remaining))}`,
        defaultTab: 'budgets',
      }
    }
    if (intramesSeverity === 'warning') {
      const primary = visibleIntrames[0]
      const dateStr = format(parseISO(primary.firstDeficitDate), 'd MMM', { locale: es })
      return {
        severity: 'warning',
        headline:
          visibleIntrames.length === 1
            ? `Descubierto el ${dateStr} en ${primary.accountName}: ${formatCurrency(primary.minBalance)}`
            : `${visibleIntrames.length} cuentas con descubierto temporal`,
        defaultTab: 'intrames',
      }
    }
    if (uncoveredAccounts.length > 0) {
      return {
        severity: 'warning',
        headline:
          uncoveredAccounts.length === 1
            ? `${uncoveredAccounts[0].accountName}: fijos superan ingresos (${formatCurrency(uncoveredAccounts[0].marginAfterFixed)})`
            : `${uncoveredAccounts.length} cuentas con fijos > ingresos`,
        defaultTab: 'coverage',
      }
    }
    if (diagnosis && diagnosis.fullMonthDiff > 0 && (diagnosis.fullMonthPercent === null || diagnosis.fullMonthPercent >= 15)) {
      return {
        severity: 'warning',
        headline: `Gasto previsto +${formatCurrency(diagnosis.fullMonthDiff)} vs ${diagnosis.prevMonthName}`,
        defaultTab: 'diagnosis',
      }
    }
    return {
      severity: 'healthy',
      headline: `Mes bajo control · Margen tras fijos ${formatCurrency(totalMarginAfterFixed)}`,
      defaultTab: isCurrentMonth ? 'diagnosis' : 'coverage',
    }
  }, [
    intramesSeverity,
    visibleIntrames,
    budgetAnalysis,
    uncoveredAccounts,
    diagnosis,
    totalMarginAfterFixed,
    isCurrentMonth,
  ])

  const handleToggleHeader = () => {
    if (!isExpanded) {
      setActiveTab(overall.defaultTab)
      setIsExpanded(true)
    } else {
      setIsExpanded(false)
    }
  }

  const handleSelectTab = (tab: PulseTab) => {
    if (isExpanded && activeTab === tab) {
      setIsExpanded(false)
    } else {
      setActiveTab(tab)
      setIsExpanded(true)
    }
  }

  const renderCategoryIcon = (catName: string, sizeClass = 'w-3.5 h-3.5') => {
    const targetKey = catName.trim().toLowerCase()
    const cat = categories.find((c: any) => {
      const name = typeof c === 'string' ? c : c.name
      return name.trim().toLowerCase() === targetKey
    })
    if (cat?.customIcon) {
      return (
        <img
          src={cat.customIcon}
          alt={cat.name}
          className={cn(sizeClass, 'rounded-full object-cover')}
        />
      )
    }
    const IconComp = (cat?.icon && (Icons as any)[cat.icon]) || Tag
    return <IconComp className={sizeClass} />
  }

  const formatShortDate = (isoDate: string) =>
    format(parseISO(isoDate), 'd MMM', { locale: es })

  const containerTone =
    overall.severity === 'critical'
      ? 'bg-rose-500/10 border-rose-500/30'
      : overall.severity === 'warning'
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-emerald-500/10 border-emerald-500/30'

  const iconTone =
    overall.severity === 'critical'
      ? 'bg-rose-500'
      : overall.severity === 'warning'
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  const headlineTone =
    overall.severity === 'critical'
      ? 'text-rose-700 dark:text-rose-400'
      : overall.severity === 'warning'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-emerald-700 dark:text-emerald-400'

  const pills: Array<{
    id: PulseTab
    label: string
    value: string
    dot: Severity | 'muted'
  }> = [
    {
      id: 'intrames',
      label: 'Intrames',
      value:
        visibleIntrames.length === 0
          ? 'Sin rojos'
          : visibleIntrames.length === 1
            ? formatCurrency(visibleIntrames[0].minBalance)
            : `${visibleIntrames.length} alertas`,
      dot: intramesSeverity,
    },
    ...(isCurrentMonth && budgetAnalysis
      ? [
          {
            id: 'budgets' as PulseTab,
            label: 'Presupuestos',
            value:
              !budgetAnalysis.hasBudgets && budgetAnalysis.nextMonthBudgetsTotal === 0
                ? 'Sin sobres'
                : budgetAnalysis.hasDeficit
                  ? `Déficit ${formatCurrency(budgetAnalysis.disponibleParaAsignar)}`
                  : budgetAnalysis.hasOverbudget
                    ? `${budgetAnalysis.overbudgetEnvelopes.length} excedido`
                    : `${budgetAnalysis.visibleEnvelopes.length} activos`,
            dot: budgetSeverity,
          },
        ]
      : []),
    ...(coverageSummaries.length > 0
      ? [
          {
            id: 'coverage' as PulseTab,
            label: 'Cobertura',
            value:
              uncoveredAccounts.length > 0
                ? `${uncoveredAccounts.length} ajustada${uncoveredAccounts.length > 1 ? 's' : ''}`
                : formatCurrency(totalMarginAfterFixed),
            dot: coverageSeverity,
          },
        ]
      : []),
    ...(isCurrentMonth && diagnosis
      ? [
          {
            id: 'diagnosis' as PulseTab,
            label: `Ritmo vs ${diagnosis.prevMonthName.slice(0, 3)}`,
            value: `${diagnosis.fullMonthDiff > 0 ? '+' : '-'}${formatCurrency(Math.abs(diagnosis.fullMonthDiff))}`,
            dot: diagnosisSeverity,
          },
        ]
      : []),
  ]

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs tabular-nums',
        containerTone
      )}
    >
      {/* Unified Header */}
      <div
        onClick={handleToggleHeader}
        className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs',
              iconTone
            )}
          >
            {overall.severity === 'healthy' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : overall.severity === 'critical' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pulso de {monthLabel}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 font-bold bg-background/60 border-border/50 text-muted-foreground"
              >
                Compacto
              </Badge>
            </div>
            <p className={cn('text-xs sm:text-sm font-extrabold tracking-tight truncate', headlineTone)}>
              {overall.headline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          <span className="hidden sm:inline text-xs font-bold">
            {isExpanded ? 'Ocultar' : 'Detalle'}
          </span>
          <div className="w-6 h-6 rounded-lg bg-background/60 flex items-center justify-center">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* 4-Pill Interactive Status Strip */}
      <div
        className={cn(
          'px-3 pb-2.5 sm:px-4 grid gap-1.5',
          pills.length >= 4
            ? 'grid-cols-2 lg:grid-cols-4'
            : pills.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2'
        )}
      >
        {pills.map((pill) => {
          const isActivePill = isExpanded && activeTab === pill.id
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => handleSelectTab(pill.id)}
              className={cn(
                'px-2.5 py-1.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 bg-background/75 hover:bg-background',
                isActivePill
                  ? 'border-primary/60 ring-1 ring-primary/30 shadow-xs'
                  : 'border-border/40'
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', SEVERITY_DOT[pill.dot])} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {pill.label}
                  </span>
                </div>
                <p className="text-xs font-black text-foreground truncate mt-0.5 tabular-nums">
                  {pill.value}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'w-3 h-3 text-muted-foreground shrink-0 transition-transform',
                  isActivePill && 'rotate-180 text-primary'
                )}
              />
            </button>
          )
        })}
      </div>

      {/* Expanded Detail Drawer */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2.5 sm:px-4 border-t border-border/30 bg-background/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 text-xs">
          {/* TAB: INTRAMES */}
          {activeTab === 'intrames' && (
            <div className="space-y-2">
              {visibleIntrames.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No hay descubiertos previstos durante el mes según tus movimientos pendientes.</span>
                </div>
              ) : (
                visibleIntrames.map((alert) => (
                  <div
                    key={alert.accountId}
                    className="p-2.5 rounded-xl bg-background/85 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedAccount === 'total' ? (
                          <button
                            type="button"
                            onClick={() => onSelectAccount(alert.accountId)}
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
                          'text-xs font-black',
                          alert.recoversByMonthEnd
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        Mínimo {formatCurrency(alert.minBalance)} ({formatShortDate(alert.minBalanceDate)})
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Cierre previsto: {formatCurrency(alert.projectedBalance)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: PRESUPUESTOS */}
          {activeTab === 'budgets' && budgetAnalysis && (
            <div className="space-y-2.5">
              {!budgetAnalysis.hasBudgets && budgetAnalysis.nextMonthBudgetsTotal === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>Sin sobres asignados este mes.</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/presupuestos' })}
                    className="h-7 px-2 text-xs font-bold text-primary gap-1"
                  >
                    <span>Asignar</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      className={cn(
                        'px-3 py-2 rounded-xl border flex items-center justify-between gap-2',
                        budgetAnalysis.hasDeficit
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : 'bg-background/85 border-border/40'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Wallet
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            budgetAnalysis.hasDeficit ? 'text-rose-500' : 'text-primary'
                          )}
                        />
                        <div>
                          <span className="font-semibold text-foreground block">Por Asignar</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {budgetAnalysis.hasDeficit ? 'Déficit en sobres' : 'Dinero libre en cuentas'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'font-black text-sm',
                          budgetAnalysis.hasDeficit
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-primary'
                        )}
                      >
                        {formatCurrency(budgetAnalysis.disponibleParaAsignar)}
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <div>
                          <span className="font-semibold text-blue-700 dark:text-blue-300 block capitalize">
                            Prev. {budgetAnalysis.nextMonthName}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Fijos reservados
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                        {formatCurrency(budgetAnalysis.nextMonthBudgetsTotal)}
                      </span>
                    </div>
                  </div>

                  {budgetAnalysis.visibleEnvelopes.length > 0 && (
                    <div className="space-y-1.5">
                      {budgetAnalysis.visibleEnvelopes.slice(0, 5).map((env) => (
                        <div
                          key={env.category}
                          onClick={() =>
                            navigate({ to: '/presupuestos', search: { category: env.category } })
                          }
                          className="px-3 py-2 rounded-xl bg-background/85 border border-border/40 hover:bg-background cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                                {renderCategoryIcon(env.category, 'w-3 h-3')}
                              </div>
                              <span className="font-semibold capitalize truncate">{env.category}</span>
                            </div>
                            <div className="text-right shrink-0">
                              {env.isOverbudget ? (
                                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                                  +{formatCurrency(Math.abs(env.remaining))} exc.
                                </span>
                              ) : (
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(env.remaining)} libres
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-1.5 hidden sm:inline">
                                / {formatCurrency(env.budgetAmount)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1.5">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                env.isOverbudget
                                  ? 'bg-rose-500'
                                  : env.percent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              )}
                              style={{ width: `${Math.min(env.percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-1 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: '/presupuestos' })}
                      className="h-7 px-2 text-xs font-bold text-primary gap-1"
                    >
                      <span>Ir a Presupuestos</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: COBERTURA */}
          {activeTab === 'coverage' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {coverageSummaries.map((item) => {
                const isSelected = selectedAccount === item.accountId
                const isDeficitFixed = item.fixedExpenses > 0 && item.marginAfterFixed < -0.005
                const barWidth = Math.min(100, Math.max(0, item.fixedRatioPercent))
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider truncate">
                          {item.accountName}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-black shrink-0',
                          isDeficitFixed
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {item.marginAfterFixed >= 0 ? '+' : ''}
                        {formatCurrency(item.marginAfterFixed)} tras fijos
                      </span>
                    </div>

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

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ingresos</p>
                        <p className="font-bold text-income">+{formatCurrency(item.totalIncome)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Fijos</p>
                        <p className="font-bold text-expense">
                          {item.fixedExpenses > 0 ? '-' : ''}
                          {formatCurrency(item.fixedExpenses)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Prev. cierre</p>
                        <p
                          className={cn(
                            'font-bold',
                            item.projectedBalance < 0 && 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {formatCurrency(item.projectedBalance)}
                        </p>
                      </div>
                    </div>

                    {Math.abs(item.netTransfers) > 0.005 && (
                      <div className="pt-1 border-t border-border/30 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        <ArrowRightLeft className="w-2.5 h-2.5" />
                        <span>
                          Traspasos: {item.netTransfers > 0 ? '+' : ''}
                          {formatCurrency(item.netTransfers)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB: RITMO (DIAGNOSIS) */}
          {activeTab === 'diagnosis' && diagnosis && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-background/85 border border-border/40">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-500" />
                      Gastos previstos
                    </span>
                    <span>ant: {formatCurrency(diagnosis.prevMonthTotal)}</span>
                  </div>
                  <p className="font-black text-sm mt-1">{formatCurrency(diagnosis.expectedTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(diagnosis.realAmount)} + {formatCurrency(diagnosis.pendingAmount)} fut.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-background/85 border border-border/40">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      Ingresos previstos
                    </span>
                    <span>Faltan {diagnosis.daysLeft}d</span>
                  </div>
                  <p className="font-black text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(diagnosis.curMonthIncome)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(diagnosis.realIncomeAmount)} + {formatCurrency(diagnosis.pendingIncomeAmount)} fut.
                  </p>
                </div>

                <div
                  onClick={() => navigate({ to: '/evolucion', search: { mode: 'balance' } as any })}
                  className="p-2.5 rounded-xl bg-background/85 border border-border/40 hover:border-primary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3 h-3 text-primary" />
                      Balance mes
                    </span>
                    <span>Ing. − Gas.</span>
                  </div>
                  <p
                    className={cn(
                      'font-black text-sm mt-1',
                      diagnosis.expectedNetBalance >= 0
                        ? 'text-primary'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {diagnosis.expectedNetBalance > 0 ? '+' : ''}
                    {formatCurrency(diagnosis.expectedNetBalance)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Día {diagnosis.currentDayOfMonth}: {formatCurrency(diagnosis.mtdCurAmount)} pagado
                  </p>
                </div>
              </div>

              {(diagnosis.topIncreases.length > 0 || diagnosis.topDecreases.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-background/85 border border-border/40 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Mayor subida habitual
                    </p>
                    {diagnosis.topIncreases.slice(0, 3).map((item) => (
                      <div
                        key={item.category}
                        onClick={() =>
                          navigate({ to: '/evolucion', search: { category: item.category } as any })
                        }
                        className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer"
                      >
                        <span className="capitalize truncate font-medium">{item.category}</span>
                        <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">
                          +{formatCurrency(item.diff)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-background/85 border border-border/40 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Mayor ahorro habitual
                    </p>
                    {diagnosis.topDecreases.slice(0, 3).map((item) => (
                      <div
                        key={item.category}
                        onClick={() =>
                          navigate({ to: '/evolucion', search: { category: item.category } as any })
                        }
                        className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded-lg hover:bg-muted/60 cursor-pointer"
                      >
                        <span className="capitalize truncate font-medium">{item.category}</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          -{formatCurrency(Math.abs(item.diff))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: '/evolucion' })}
                  className="h-7 px-2 text-xs font-bold text-primary gap-1"
                >
                  <span>Ver evolución completa</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
