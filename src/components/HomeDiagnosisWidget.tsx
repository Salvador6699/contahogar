import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  format,
  parseISO,
  getDate,
  getDaysInMonth,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock,
  Tag,
  Calendar,
  Scale,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Transaction, Category, Account } from '@/types/finance'
import { formatCurrency, isTransfer } from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface HomeDiagnosisWidgetProps {
  transactions: Transaction[]
  categories: Category[]
  accounts?: Account[]
}

export function HomeDiagnosisWidget({
  transactions,
  categories,
  accounts = [],
}: HomeDiagnosisWidgetProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  // Helper for category icon
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

  const diagnosis = useMemo(() => {
    const now = new Date()
    const currentDayOfMonth = getDate(now)
    const daysInCurrentMonth = getDaysInMonth(now)
    const currentMonthKey = format(now, 'yyyy-MM')

    const prevMonthDate = subMonths(now, 1)
    const prevMonthKey = format(prevMonthDate, 'yyyy-MM')
    const daysInPrevMonth = getDaysInMonth(prevMonthDate)
    const targetPrevDay = Math.min(currentDayOfMonth, daysInPrevMonth)

    const resolveCanonical = (rawName: string) => {
      const trimmed = rawName.trim()
      const norm = trimmed.toLowerCase()
      const found = categories.find((c: any) => {
        const n = typeof c === 'string' ? c : c.name
        return n.trim().toLowerCase() === norm
      })
      if (found) return typeof found === 'string' ? found.trim() : found.name.trim()
      return trimmed
    }

    // Movimientos válidos globales (incluyendo todos los gastos e ingresos futuros no ignorados)
    const validTxs = transactions.filter((t) => {
      if (isTransfer(t.category)) return false
      if (t.amount <= 0) return false
      if (t.isPending && t.isIgnored) return false
      return true
    })

    const expenseTxs = validTxs.filter((t) => t.type === 'expense')
    const incomeTxs = validTxs.filter((t) => t.type === 'income')

    // Mes actual (ejecutado + gastos futuros del mes) vs Mes anterior cerrado
    const curMonthTxs = expenseTxs.filter((t) => t.date.startsWith(currentMonthKey))
    const prevMonthTxs = expenseTxs.filter(
      (t) => t.date.startsWith(prevMonthKey) && !t.isPending
    )

    // Ingresos del mes actual (cobrados + ingresos futuros previstos)
    const curMonthIncomeTxs = incomeTxs.filter((t) => t.date.startsWith(currentMonthKey))
    const realIncomeAmount = Number(
      curMonthIncomeTxs
        .filter((t) => !t.isPending)
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2)
    )
    const pendingIncomeAmount = Number(
      curMonthIncomeTxs
        .filter((t) => t.isPending)
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2)
    )
    const curMonthIncome = Number((realIncomeAmount + pendingIncomeAmount).toFixed(2))

    // Gastos reales (ejecutados) y futuros (previstos) del mes en curso
    const curRealTxs = curMonthTxs.filter((t) => !t.isPending)
    const curPendingTxs = curMonthTxs.filter((t) => t.isPending)

    const realAmount = Number(curRealTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
    const pendingAmount = Number(curPendingTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
    const expectedTotal = Number((realAmount + pendingAmount).toFixed(2))
    const prevMonthTotal = Number(prevMonthTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))

    // Comparativa principal: Total previsto del mes (Ejecutado + Gastos Futuros) vs Mes anterior completo
    const fullMonthDiff = Number((expectedTotal - prevMonthTotal).toFixed(2))
    let fullMonthPercent: number | null = null
    if (prevMonthTotal > 0) {
      fullMonthPercent = Number((((expectedTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(1))
    } else if (prevMonthTotal === 0 && expectedTotal > 0) {
      fullMonthPercent = 100
    } else if (prevMonthTotal === 0 && expectedTotal === 0) {
      fullMonthPercent = 0
    }

    // Balance / Remanente previsto del mes (Ingresos cobrados y futuros - Gastos ejecutados y futuros)
    const expectedNetBalance = Number((curMonthIncome - expectedTotal).toFixed(2))

    // Dato secundario: Gasto ejecutado a día de hoy vs mismo día del mes anterior
    const mtdPrevTxs = prevMonthTxs.filter(
      (t) => getDate(parseISO(t.date)) <= targetPrevDay
    )
    const mtdCurAmount = realAmount
    const mtdPrevAmount = Number(mtdPrevTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
    const mtdDiff = Number((mtdCurAmount - mtdPrevAmount).toFixed(2))
    let mtdPercent: number | null = null
    if (mtdPrevAmount > 0) {
      mtdPercent = Number((((mtdCurAmount - mtdPrevAmount) / mtdPrevAmount) * 100).toFixed(1))
    } else if (mtdPrevAmount === 0 && mtdCurAmount > 0) {
      mtdPercent = 100
    } else if (mtdPrevAmount === 0 && mtdCurAmount === 0) {
      mtdPercent = 0
    }

    // Diferencias por categoría usando el TOTAL PREVISTO del mes (Ejecutado + Gastos Futuros) vs mes anterior completo
    const curCatTotals: Record<string, number> = {}
    const prevCatTotals: Record<string, number> = {}
    const catDisplayNames: Record<string, string> = {}

    curMonthTxs.forEach((t) => {
      const norm = t.category.trim().toLowerCase()
      if (!catDisplayNames[norm]) catDisplayNames[norm] = resolveCanonical(t.category)
      curCatTotals[norm] = (curCatTotals[norm] || 0) + t.amount
    })

    prevMonthTxs.forEach((t) => {
      const norm = t.category.trim().toLowerCase()
      if (!catDisplayNames[norm]) catDisplayNames[norm] = resolveCanonical(t.category)
      prevCatTotals[norm] = (prevCatTotals[norm] || 0) + t.amount
    })

    const allCatNorms = Array.from(
      new Set([...Object.keys(curCatTotals), ...Object.keys(prevCatTotals)])
    )

    const catDiffs = allCatNorms.map((norm) => {
      const cur = Number((curCatTotals[norm] || 0).toFixed(2))
      const prev = Number((prevCatTotals[norm] || 0).toFixed(2))
      const diff = Number((cur - prev).toFixed(2))
      let percentageDiff: number | null = null
      if (prev > 0) {
        percentageDiff = Number((((cur - prev) / prev) * 100).toFixed(1))
      } else if (prev === 0 && cur > 0) {
        percentageDiff = 100
      }
      return {
        category: catDisplayNames[norm] || norm,
        currentAmount: cur,
        prevAmount: prev,
        diff,
        percentageDiff,
      }
    })

    // Ordenar por impacto real en euros (€)
    const topIncreases = catDiffs
      .filter((d) => d.diff > 0.01)
      .sort((a, b) => {
        if (b.diff !== a.diff) return b.diff - a.diff
        return (b.percentageDiff ?? 0) - (a.percentageDiff ?? 0)
      })
      .slice(0, 5)

    const topDecreases = catDiffs
      .filter((d) => d.diff < -0.01)
      .sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff
        return (a.percentageDiff ?? 0) - (b.percentageDiff ?? 0)
      })
      .slice(0, 5)

    return {
      currentDayOfMonth,
      daysInCurrentMonth,
      daysLeft: Math.max(0, daysInCurrentMonth - currentDayOfMonth),
      currentMonthName: format(now, 'MMMM', { locale: es }),
      prevMonthName: format(prevMonthDate, 'MMMM', { locale: es }),
      realAmount,
      realTxCount: curRealTxs.length,
      pendingAmount,
      pendingTxCount: curPendingTxs.length,
      expectedTotal,
      prevMonthTotal,
      fullMonthDiff,
      fullMonthPercent,
      realIncomeAmount,
      pendingIncomeAmount,
      curMonthIncome,
      expectedNetBalance,
      mtdCurAmount,
      mtdPrevAmount,
      mtdDiff,
      mtdPercent,
      topIncreases,
      topDecreases,
    }
  }, [transactions, accounts, categories])

  const isOverspending = diagnosis.fullMonthDiff > 0
  const isHighAlert =
    isOverspending && (diagnosis.fullMonthPercent === null || diagnosis.fullMonthPercent >= 15)

  return (
    <div
      className={cn(
        'w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs',
        isHighAlert
          ? 'bg-rose-500/10 border-rose-500/30'
          : isOverspending
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30'
      )}
    >
      {/* Compact Main Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {/* Left: Icon & Headline */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs',
              isHighAlert
                ? 'bg-rose-500'
                : isOverspending
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            )}
          >
            {isOverspending ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0 text-xs sm:text-sm">
            <span className="font-extrabold text-foreground tracking-tight whitespace-nowrap">
              Previsto {diagnosis.currentMonthName}:
            </span>
            <span
              className={cn(
                'font-bold truncate',
                isHighAlert
                  ? 'text-rose-600 dark:text-rose-400'
                  : isOverspending
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
              )}
            >
              {isOverspending ? (
                <>
                  +{formatCurrency(diagnosis.fullMonthDiff)}
                  {diagnosis.fullMonthPercent !== null && ` (+${diagnosis.fullMonthPercent}%)`}{' '}
                  vs {diagnosis.prevMonthName}
                </>
              ) : (
                <>
                  -{formatCurrency(Math.abs(diagnosis.fullMonthDiff))}
                  {diagnosis.fullMonthPercent !== null &&
                    ` (-${Math.abs(diagnosis.fullMonthPercent)}%)`}{' '}
                  menos vs {diagnosis.prevMonthName}
                </>
              )}
            </span>

            {/* Pill: Ejecutado + Gastos Futuros */}
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-lg border border-border/40">
              <span>Pagado: {formatCurrency(diagnosis.realAmount)}</span>
              {diagnosis.pendingAmount > 0 && (
                <>
                  <span className="opacity-50">+</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Futuros: {formatCurrency(diagnosis.pendingAmount)}
                  </span>
                </>
              )}
              <span className="opacity-50">=</span>
              <strong className="text-foreground">{formatCurrency(diagnosis.expectedTotal)}</strong>
            </span>
          </div>
        </div>

        {/* Right: Toggle Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-muted-foreground hover:text-foreground hidden sm:inline">
            {isExpanded ? 'Ocultar' : '¿Por qué?'}
          </span>
          <div className="w-6 h-6 rounded-lg bg-background/60 flex items-center justify-center text-muted-foreground">
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
        <div className="px-4 pb-4 pt-2 border-t border-border/30 bg-background/50 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 text-xs">
          {/* Fila 1: Gasto Total Previsto (Pagado + Futuros), Ingresos Previstos (Cobrado + Futuros) y Balance del Mes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Tarjeta 1: Gasto Total Previsto vs Mes Anterior */}
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/40 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-500" />
                  Gastos (Pagado + Futuros)
                </span>
                <span>ant: {formatCurrency(diagnosis.prevMonthTotal)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-0.5">
                <span className="font-black text-sm text-foreground">
                  {formatCurrency(diagnosis.expectedTotal)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatCurrency(diagnosis.realAmount)} +{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    {formatCurrency(diagnosis.pendingAmount)} fut.
                  </strong>
                </span>
              </div>
            </div>

            {/* Tarjeta 2: Ingresos Totales Previstos (Cobrado + Futuros) */}
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/40 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  Ingresos (Cobrado + Futuros)
                </span>
                <span>Faltan {diagnosis.daysLeft}d</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-0.5">
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(diagnosis.curMonthIncome)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatCurrency(diagnosis.realIncomeAmount)} +{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(diagnosis.pendingIncomeAmount)} fut.
                  </strong>
                </span>
              </div>
            </div>

            {/* Tarjeta 3: Balance / Remanente Previsto del Mes (Ingresos - Gastos con futuros) */}
            <div
              onClick={() => navigate({ to: '/evolucion', search: { mode: 'balance' } as any })}
              className="p-2.5 rounded-xl bg-background/80 border border-border/40 hover:border-primary/40 transition-colors cursor-pointer flex flex-col justify-between gap-1"
              title="Ver evolución de Balance (Ingresos vs Gastos)"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Scale className="w-3 h-3 text-primary" />
                  Balance Previsto Mes
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Ing. − Gas.
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-0.5">
                <span
                  className={cn(
                    'font-black text-sm',
                    diagnosis.expectedNetBalance >= 0
                      ? 'text-primary'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {diagnosis.expectedNetBalance > 0 ? '+' : ''}
                  {formatCurrency(diagnosis.expectedNetBalance)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  A día {diagnosis.currentDayOfMonth}:{' '}
                  <strong>{formatCurrency(diagnosis.mtdCurAmount)}</strong> pagado
                </span>
              </div>
            </div>
          </div>

          {/* Fila 2: Top 5 Aumentos y Top 5 Descensos (ordenados por impacto real en €) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
            {/* Top 5 mayor subida en € */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-background/80 border border-border/40">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/30">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Partidas que más suben (€)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  vs {diagnosis.prevMonthName} (incl. futuros)
                </span>
              </div>

              {diagnosis.topIncreases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 text-center">
                  Ninguna categoría aumentó este mes.
                </p>
              ) : (
                <div className="space-y-1.5 pt-0.5">
                  {diagnosis.topIncreases.map((item) => (
                    <div
                      key={item.category}
                      onClick={() =>
                        navigate({
                          to: '/evolucion',
                          search: { category: item.category } as any,
                        })
                      }
                      className="p-2 rounded-xl bg-background/90 border border-border/30 hover:border-rose-500/40 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      title={`Ver evolución de ${item.category}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {renderCategoryIcon(item.category, 'w-3 h-3')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground capitalize truncate text-xs leading-tight">
                            {item.category}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 text-right">
                        {item.percentageDiff !== null && (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold text-[10px] px-1.5 py-0"
                          >
                            +{item.percentageDiff}%
                          </Badge>
                        )}
                        <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                          +{formatCurrency(item.diff)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 5 menor gasto en € */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-background/80 border border-border/40">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/30">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Partidas con menor gasto (€)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  vs {diagnosis.prevMonthName} (incl. futuros)
                </span>
              </div>

              {diagnosis.topDecreases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 text-center">
                  Ninguna categoría disminuyó este mes.
                </p>
              ) : (
                <div className="space-y-1.5 pt-0.5">
                  {diagnosis.topDecreases.map((item) => (
                    <div
                      key={item.category}
                      onClick={() =>
                        navigate({
                          to: '/evolucion',
                          search: { category: item.category } as any,
                        })
                      }
                      className="p-2 rounded-xl bg-background/90 border border-border/30 hover:border-emerald-500/40 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      title={`Ver evolución de ${item.category}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {renderCategoryIcon(item.category, 'w-3 h-3')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground capitalize truncate text-xs leading-tight">
                            {item.category}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 text-right">
                        {item.percentageDiff !== null && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px] px-1.5 py-0"
                          >
                            {item.percentageDiff}%
                          </Badge>
                        )}
                        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                          -{formatCurrency(Math.abs(item.diff))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Enlaces rápidos a Evolución */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30 flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({ to: '/evolucion', search: { mode: 'balance' } as any })
              }
              className="h-8 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Ver Balance Ingresos vs Gastos</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/evolucion' })}
              className="h-8 px-2.5 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg gap-1"
            >
              <span>Ver evolución completa</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
