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
  Sparkles,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  Repeat,
  Tag,
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
}: HomeDiagnosisWidgetProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

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

  const diagnosis = useMemo(() => {
    const now = new Date()
    const currentDayOfMonth = getDate(now)
    const daysInCurrentMonth = getDaysInMonth(now)
    const currentMonthKey = format(now, 'yyyy-MM')

    const prevMonthDate = subMonths(now, 1)
    const prevMonthKey = format(prevMonthDate, 'yyyy-MM')
    const daysInPrevMonth = getDaysInMonth(prevMonthDate)
    const targetPrevDay = Math.min(currentDayOfMonth, daysInPrevMonth)

    // Filter valid expense transactions (global across all accounts)
    const expenseTxs = transactions.filter((t) => {
      if (t.type !== 'expense') return false
      if (isTransfer(t.category)) return false
      if (t.isPending && t.isIgnored) return false
      return true
    })

    // Current month transactions
    const curMonthTxs = expenseTxs.filter((t) => t.date.startsWith(currentMonthKey))
    const prevMonthTxs = expenseTxs.filter((t) => t.date.startsWith(prevMonthKey))

    // Real and Pending breakdown for current month
    const curRealTxs = curMonthTxs.filter((t) => !t.isPending)
    const curPendingTxs = curMonthTxs.filter((t) => t.isPending)

    const realAmount = curRealTxs.reduce((sum, t) => sum + t.amount, 0)
    const pendingAmount = curPendingTxs.reduce((sum, t) => sum + t.amount, 0)
    const expectedTotal = realAmount + pendingAmount

    // MTD (Month to date) calculation up to today
    const mtdCurTxs = curMonthTxs.filter(
      (t) => getDate(parseISO(t.date)) <= currentDayOfMonth
    )
    const mtdPrevTxs = prevMonthTxs.filter(
      (t) => getDate(parseISO(t.date)) <= targetPrevDay
    )

    const mtdCurAmount = mtdCurTxs.reduce((sum, t) => sum + t.amount, 0)
    const mtdPrevAmount = mtdPrevTxs.reduce((sum, t) => sum + t.amount, 0)

    const mtdDiff = mtdCurAmount - mtdPrevAmount
    let mtdPercent: number | null = null
    if (mtdPrevAmount > 0) {
      mtdPercent = Number((((mtdCurAmount - mtdPrevAmount) / mtdPrevAmount) * 100).toFixed(1))
    } else if (mtdPrevAmount === 0 && mtdCurAmount > 0) {
      mtdPercent = 100
    } else if (mtdPrevAmount === 0 && mtdCurAmount === 0) {
      mtdPercent = 0
    }

    // Category breakdown differences at day-to-day
    const curCatTotals: Record<string, number> = {}
    mtdCurTxs.forEach((t) => {
      curCatTotals[t.category] = (curCatTotals[t.category] || 0) + t.amount
    })

    const prevCatTotals: Record<string, number> = {}
    mtdPrevTxs.forEach((t) => {
      prevCatTotals[t.category] = (prevCatTotals[t.category] || 0) + t.amount
    })

    const allCatNames = Array.from(
      new Set([...Object.keys(curCatTotals), ...Object.keys(prevCatTotals)])
    )

    const catDiffs = allCatNames.map((name) => {
      const cur = curCatTotals[name] || 0
      const prev = prevCatTotals[name] || 0
      const diff = Number((cur - prev).toFixed(2))
      let percentageDiff: number | null = null
      if (prev > 0) {
        percentageDiff = Number((((cur - prev) / prev) * 100).toFixed(1))
      } else if (prev === 0 && cur > 0) {
        percentageDiff = 100
      }
      return {
        category: name,
        currentAmount: cur,
        prevAmount: prev,
        diff,
        percentageDiff,
      }
    })

    const topIncreases = catDiffs
      .filter((d) => d.diff > 0.01)
      .sort((a, b) => {
        const pctA = a.percentageDiff ?? 0
        const pctB = b.percentageDiff ?? 0
        if (pctB !== pctA) return pctB - pctA
        return b.diff - a.diff
      })
      .slice(0, 5)

    const topDecreases = catDiffs
      .filter((d) => d.diff < -0.01)
      .sort((a, b) => {
        const pctA = a.percentageDiff ?? 0
        const pctB = b.percentageDiff ?? 0
        if (pctA !== pctB) return pctA - pctB
        return a.diff - b.diff
      })
      .slice(0, 5)

    return {
      currentDayOfMonth,
      daysInCurrentMonth,
      daysLeft: Math.max(0, daysInCurrentMonth - currentDayOfMonth),
      currentMonthName: format(now, 'MMMM', { locale: es }),
      realAmount,
      realTxCount: curRealTxs.length,
      pendingAmount,
      pendingTxCount: curPendingTxs.length,
      expectedTotal,
      mtdCurAmount,
      mtdPrevAmount,
      mtdDiff,
      mtdPercent,
      topIncreases,
      topDecreases,
    }
  }, [transactions])

  const isOverspending = diagnosis.mtdDiff > 0
  const isHighAlert = isOverspending && (diagnosis.mtdPercent === null || diagnosis.mtdPercent >= 15)

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
      {/* Compact Main Bar (Option B) */}
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
              A día {diagnosis.currentDayOfMonth}:
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
                  +{formatCurrency(diagnosis.mtdDiff)}
                  {diagnosis.mtdPercent !== null && ` (+${diagnosis.mtdPercent}%)`}{' '}
                  vs mes anterior
                </>
              ) : (
                <>
                  -{formatCurrency(Math.abs(diagnosis.mtdDiff))}
                  {diagnosis.mtdPercent !== null && ` (-${Math.abs(diagnosis.mtdPercent)}%)`}{' '}
                  ahorro vs mes ant.
                </>
              )}
            </span>

            {/* Pill Cobrado + Previsto */}
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-lg border border-border/40">
              <span>Cobrado: {formatCurrency(diagnosis.realAmount)}</span>
              <span className="opacity-50">+</span>
              <span className="text-amber-600 dark:text-amber-400">
                Prev: {formatCurrency(diagnosis.pendingAmount)}
              </span>
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
          {/* Fila 1: Previsión Cierre de Mes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-background/80 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                Faltan <strong>{diagnosis.daysLeft} días</strong> para cerrar {diagnosis.currentMonthName}:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap font-semibold text-xs">
              <span className="text-foreground">
                Cobrado: <strong>{formatCurrency(diagnosis.realAmount)}</strong>
              </span>
              <span className="text-muted-foreground">+</span>
              <span className="text-amber-600 dark:text-amber-400">
                Previsto: <strong>{formatCurrency(diagnosis.pendingAmount)}</strong>
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="text-primary font-bold">
                Total esperado: <strong>{formatCurrency(diagnosis.expectedTotal)}</strong>
              </span>
            </div>
          </div>

          {/* Fila 2: Top 5 Aumentos y Top 5 Descensos (porcentuales) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
            {/* Top 5 que más aumentan (%) */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-background/80 border border-border/40">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/30">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Top 5 mayor aumento (%)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  vs día {diagnosis.currentDayOfMonth} mes ant.
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
                      className="p-2 rounded-xl bg-background/90 border border-border/30 flex items-center justify-between gap-2"
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
                            +{formatCurrency(item.diff)} ({formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)})
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-extrabold text-[11px] px-1.5 py-0.5"
                        >
                          +{item.percentageDiff}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 5 que más disminuyen (%) */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-background/80 border border-border/40">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/30">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Top 5 mayor descenso / ahorro (%)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  vs día {diagnosis.currentDayOfMonth} mes ant.
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
                      className="p-2 rounded-xl bg-background/90 border border-border/30 flex items-center justify-between gap-2"
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
                            -{formatCurrency(Math.abs(item.diff))} ({formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)})
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-extrabold text-[11px] px-1.5 py-0.5"
                        >
                          {item.percentageDiff}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Enlace a Evolución */}
          <div className="flex items-center justify-end pt-1 border-t border-border/30">
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
