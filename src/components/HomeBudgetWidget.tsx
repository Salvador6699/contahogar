import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  format,
  getDate,
  getDaysInMonth,
  addMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Target,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock,
  Calendar,
  Wallet,
  Tag,
  AlertTriangle,
  Repeat,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Transaction, Category, Budget, Account } from '@/types/finance'
import {
  formatCurrency,
  calculateTotalBalance,
  calculatePendingImpact,
} from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface HomeBudgetWidgetProps {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  accounts?: Account[]
}

export function HomeBudgetWidget({
  transactions,
  categories,
  budgets,
  accounts = [],
}: HomeBudgetWidgetProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  // Helper to check transfer category
  const isTransfer = (category: string) => {
    const normalized = category
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normalized === 'transferencia'
  }

  // Helper for category icon
  const renderCategoryIcon = (catName: string, sizeClass = 'w-3.5 h-3.5') => {
    const cat = categories.find((c: any) => {
      const name = typeof c === 'string' ? c : c.name
      return name.toLowerCase() === catName.toLowerCase()
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

  const analysis = useMemo(() => {
    const now = new Date()
    const currentDayOfMonth = getDate(now)
    const daysInMonth = getDaysInMonth(now)
    const currentMonthKey = format(now, 'yyyy-MM')
    const currentMonthName = format(now, 'MMMM', { locale: es })

    // Provisión Próximo Mes (nextMonthBudgetsTotal)
    const nextMonthDate = addMonths(now, 1)
    const nextMonthKey = format(nextMonthDate, 'yyyy-MM')
    const nextMonthName = format(nextMonthDate, 'MMMM', { locale: es })

    const nextMonthExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.date.startsWith(nextMonthKey) &&
        !isTransfer(t.category) &&
        !t.isIgnored
    )
    const nextMonthBudgetsTotal = Number(
      nextMonthExpenses.reduce((acc, t) => acc + t.amount, 0).toFixed(2)
    )

    // Current month active budget envelopes
    const activeBudgets = budgets.filter(
      (b) => b.month === currentMonthKey && !isTransfer(b.category)
    )

    // Filter valid expense transactions for current month (global across all accounts)
    const curMonthExpenses = transactions.filter((t) => {
      if (t.type !== 'expense') return false
      if (isTransfer(t.category)) return false
      if (!t.date.startsWith(currentMonthKey)) return false
      if (t.isPending && t.isIgnored) return false
      return true
    })

    // Group expenses by category separating real (paid) from pending
    const catRealTotals: Record<string, number> = {}
    const catPendingTotals: Record<string, number> = {}

    curMonthExpenses.forEach((t) => {
      if (t.isPending) {
        catPendingTotals[t.category] = (catPendingTotals[t.category] || 0) + t.amount
      } else {
        catRealTotals[t.category] = (catRealTotals[t.category] || 0) + t.amount
      }
    })

    // Compute status per budgeted envelope
    const envelopes = activeBudgets.map((b) => {
      const realSpent = Number((catRealTotals[b.category] || 0).toFixed(2))
      const pendingSpent = Number((catPendingTotals[b.category] || 0).toFixed(2))
      const budgetAmount = b.amount
      
      // Dinero restante en el sobre para seguir gastando
      const remaining = Number((budgetAmount - realSpent).toFixed(2))
      const percent = budgetAmount > 0 ? Number(((realSpent / budgetAmount) * 100).toFixed(1)) : 0
      
      // ¿Está cubierto el gasto previsto pendiente?
      const isPendingCovered = remaining >= pendingSpent
      const isOverbudget = remaining < -0.005
      
      // Los sobres al 100% (sin dinero restante y sin sobregasto) NO deben aparecer
      const isExact100 = !isOverbudget && remaining <= 0.005
      
      // Todavía queda dinero en el sobre para gastar o pendiente
      const hasMoneyLeft = remaining > 0.005
      
      // En peligro: está sobrepasado O (tiene dinero pero le queda menos del 20% / al 80% o más O no cubre lo previsto)
      const isDanger = isOverbudget || (hasMoneyLeft && (percent >= 80 || (!isPendingCovered && pendingSpent > 0)))

      return {
        category: b.category,
        budgetAmount,
        realSpent,
        pendingSpent,
        remaining,
        percent,
        isOverbudget,
        isExact100,
        isDanger,
        hasMoneyLeft,
        isPendingCovered,
        isExclusivelyPending: realSpent === 0 && pendingSpent > 0,
      }
    })

    // Total budgeted
    const totalBudget = Number(activeBudgets.reduce((sum, b) => sum + b.amount, 0).toFixed(2))

    // Disponible para Asignar calculation (strictly identical to BudgetPage.tsx)
    let disponibleParaAsignar = 0
    if (accounts.length > 0) {
      const realBalance = calculateTotalBalance(accounts, transactions, false, currentMonthKey)
      let currentMonthPendingImpact = 0
      accounts.forEach((acc) => {
        if (!acc.excludeFromTotals) {
          currentMonthPendingImpact += calculatePendingImpact(transactions, currentMonthKey, acc.id)
        }
      })
      const baseCapital = realBalance + currentMonthPendingImpact
      const baseGastos = Number(
        curMonthExpenses.reduce((sum, t) => sum + t.amount, 0).toFixed(2)
      )
      const baseBudgets = Number(
        activeBudgets.reduce((sum, b) => sum + b.amount, 0).toFixed(2)
      )
      disponibleParaAsignar = Number(
        (baseCapital + baseGastos - baseBudgets - nextMonthBudgetsTotal).toFixed(2)
      )
    }

    const hasDeficit = disponibleParaAsignar < 0
    const hasOverbudget = envelopes.some((e) => e.isOverbudget)
    const overbudgetEnvelopes = envelopes.filter((e) => e.isOverbudget)

    // Filtrar sobres:
    // SOLO sobres en peligro o en los que todavía queda dinero.
    // Los sobres al 100% completados NO deben aparecer.
    const visibleEnvelopes = envelopes
      .filter((e) => !e.isExact100 && (e.isDanger || e.hasMoneyLeft))
      .sort((a, b) => {
        // 1. Excedidos primero
        if (a.isOverbudget && !b.isOverbudget) return -1
        if (!a.isOverbudget && b.isOverbudget) return 1
        // 2. En peligro primero (ej: >= 80% con poco margen restante)
        if (a.isDanger && !b.isDanger) return -1
        if (!a.isDanger && b.isDanger) return 1
        // 3. Con dinero restante por mayor saldo
        return b.remaining - a.remaining
      })

    return {
      currentDayOfMonth,
      daysInMonth,
      currentMonthKey,
      currentMonthName,
      nextMonthName,
      nextMonthBudgetsTotal,
      envelopes,
      visibleEnvelopes,
      hasBudgets: envelopes.length > 0,
      totalBudget,
      disponibleParaAsignar,
      hasDeficit,
      hasOverbudget,
      overbudgetEnvelopes,
    }
  }, [transactions, categories, budgets, accounts])

  // Empty state if no budgets and no next month provision
  if (!analysis.hasBudgets && analysis.nextMonthBudgetsTotal === 0) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-border/60 bg-muted/20 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
          <span>
            Presupuestos de <strong className="capitalize text-foreground">{analysis.currentMonthName}</strong>: sin sobres asignados.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/presupuestos' })}
          className="h-7 px-2.5 text-xs font-bold text-primary hover:text-primary/80 gap-1"
        >
          <span>Asignar</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  // Determine overall status color:
  // If there's a negative allocation deficit or overbudget envelope -> Red/Rose
  // Otherwise -> Emerald
  const isCritical = analysis.hasDeficit || analysis.hasOverbudget

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs',
        isCritical
          ? 'bg-rose-500/10 border-rose-500/30'
          : 'bg-emerald-500/10 border-emerald-500/30'
      )}
    >
      {/* Compact Main Bar (Option B) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {/* Left: Icon & Headline */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs',
              isCritical ? 'bg-rose-500' : 'bg-emerald-500'
            )}
          >
            {isCritical ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0 text-xs sm:text-sm">
            {/* Primary message: Flag the deficit immediately if negative */}
            {analysis.hasDeficit ? (
              <span className="font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                ⚠️ Déficit de asignación: {formatCurrency(analysis.disponibleParaAsignar)}
              </span>
            ) : analysis.hasOverbudget ? (
              <span className="font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                ⚠️ {analysis.overbudgetEnvelopes[0].category} excedido en +{formatCurrency(Math.abs(analysis.overbudgetEnvelopes[0].remaining))}
              </span>
            ) : (
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
                ✅ Presupuestos cubiertos ({analysis.visibleEnvelopes.length} {analysis.visibleEnvelopes.length === 1 ? 'sobre activo' : 'sobres activos'})
              </span>
            )}

            {/* Pill: Provisión Próximo Mes */}
            {analysis.nextMonthBudgetsTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>Prev. {analysis.nextMonthName}: {formatCurrency(analysis.nextMonthBudgetsTotal)}</span>
              </span>
            )}

            {/* Pill: Highlight 1 active envelope with available margin */}
            {analysis.envelopes
              .filter((env) => env.realSpent > 0 && env.remaining > 0)
              .slice(0, 1)
              .map((env) => (
                <span
                  key={env.category}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-lg border border-border/40"
                >
                  <span>{env.category}:</span>
                  <strong className="text-foreground">{formatCurrency(env.remaining)} libres</strong>
                </span>
              ))}
          </div>
        </div>

        {/* Right: Toggle Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-muted-foreground hover:text-foreground hidden sm:inline">
            {isExpanded ? 'Ocultar' : 'Ver detalle'}
          </span>
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-background/60 flex items-center justify-center text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details Drawer */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-border/30 bg-background/50 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200 text-xs">
          {/* Bloque 1: Resumen Compacto de Asignación y Provisión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Por Asignar */}
            <div
              className={cn(
                'px-3 py-2 rounded-xl border flex items-center justify-between gap-2',
                analysis.hasDeficit
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-background/80 border-border/40'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Wallet
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    analysis.hasDeficit ? 'text-rose-500' : 'text-primary'
                  )}
                />
                <div className="min-w-0">
                  <span className="font-semibold text-foreground text-xs block truncate">
                    Por Asignar
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {analysis.hasDeficit
                      ? '⚠️ Déficit (ajustar sobres)'
                      : 'Dinero libre en cuentas'}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={cn(
                    'font-black text-sm block',
                    analysis.hasDeficit
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-primary'
                  )}
                >
                  {formatCurrency(analysis.disponibleParaAsignar)}
                </span>
                {analysis.hasDeficit && (
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">
                    En negativo
                  </span>
                )}
              </div>
            </div>

            {/* Provisión Próximo Mes */}
            <div className="px-3 py-2 rounded-xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-blue-700 dark:text-blue-300 text-xs block truncate">
                    Prev. {analysis.nextMonthName}
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    Gastos fijos reservados
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-sm text-blue-600 dark:text-blue-400 block">
                  {formatCurrency(analysis.nextMonthBudgetsTotal)}
                </span>
                <span className="text-[9px] font-semibold text-blue-500/80 block">
                  Ya restado de cuentas
                </span>
              </div>
            </div>
          </div>

          {/* Bloque 2: Sobres en peligro o con saldo disponible */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              <span>
                Sobres activos ({analysis.visibleEnvelopes.length}):
              </span>
              <span>Estado / Saldo</span>
            </div>

            {analysis.visibleEnvelopes.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground bg-background/50 rounded-xl border border-dashed border-border/50">
                Todos los sobres están al 100% o sin saldo activo.
              </div>
            ) : (
              <div className="space-y-1.5">
                {analysis.visibleEnvelopes.map((env) => (
                  <div
                    key={env.category}
                    className="px-3 py-2 rounded-xl bg-background/80 border border-border/40 hover:bg-background transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {renderCategoryIcon(env.category, 'w-3 h-3')}
                        </div>
                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-foreground capitalize truncate">
                            {env.category}
                          </span>

                          {env.isOverbudget ? (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                              Excedido
                            </span>
                          ) : env.percent >= 80 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                              Al {env.percent}%
                            </span>
                          ) : env.isExclusivelyPending ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0 flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Cobro pend.</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-baseline gap-1.5">
                        {env.isOverbudget ? (
                          <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400">
                            +{formatCurrency(Math.abs(env.remaining))}
                          </span>
                        ) : env.isExclusivelyPending ? (
                          <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400">
                            {formatCurrency(env.pendingSpent)} reserv.
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(env.remaining)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              libres
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                          / {formatCurrency(env.budgetAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Barra visual del sobre fina y elegante */}
                    <div className="w-full h-1 bg-muted/80 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          env.isOverbudget
                            ? 'bg-rose-500'
                            : env.isExclusivelyPending
                              ? 'bg-blue-500'
                              : env.percent >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                        )}
                        style={{
                          width: `${Math.min(
                            env.isExclusivelyPending ? 100 : env.percent,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloque 3: Enlace a Presupuestos */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px] text-muted-foreground">
            <span>
              {analysis.hasDeficit
                ? 'Ajusta tus sobres para resolver el déficit'
                : 'Control de sobres en tiempo real'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/presupuestos' })}
              className="h-7 px-2 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg gap-1"
            >
              <span>Ir a Sobres</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
