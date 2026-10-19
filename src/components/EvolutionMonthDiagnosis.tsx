import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  Receipt,
  Calendar,
  ArrowRight,
  HelpCircle,
  Repeat,
  Scale,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Transaction, Category, Account } from '@/types/finance'
import { formatCurrency } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export interface CategoryDiff {
  category: string
  currentAmount: number
  prevAmount: number
  diff: number
  percentageDiff: number | null
}

export interface MonthEvolutionData {
  monthKey: string
  monthLabel: string
  fullMonthName: string
  date: Date
  amount: number
  realAmount: number
  pendingAmount: number
  prevAmount: number | null
  prevRealAmount: number | null
  fullMonthPrevAmount?: number | null
  fullMonthPercentageChange?: number | null
  fullMonthAbsoluteChange?: number | null
  percentageChange: number | null
  absoluteChange: number | null
  // Balance mode fields
  incomeAmount?: number
  expenseAmount?: number
  netAmount?: number
  prevNetAmount?: number | null
  savingsRate?: number | null
  txCount: number
  realTxCount: number
  pendingTxCount: number
  transactions: Transaction[]
  prevTransactions: Transaction[]
  isCurrentMonth: boolean
  daysInMonth: number
  currentDayOfMonth: number
  // MTD (Month to date) equivalent comparison
  mtdCurrentAmount: number
  mtdPrevAmount: number | null
  mtdPercentageChange: number | null
  mtdAbsoluteChange: number | null
  mtdCurrentTxs?: Transaction[]
  mtdPrevTxs?: Transaction[]
  // Analysis
  categoryDiffs: CategoryDiff[]
  topIncreases: CategoryDiff[]
  topDecreases: CategoryDiff[]
  topTransactions: Transaction[]
  summaryExplanation: string
  // If specific category
  avgTicket: number
  prevAvgTicket: number | null
}

interface EvolutionMonthDiagnosisProps {
  data: MonthEvolutionData
  movementType: 'expense' | 'income' | 'balance'
  selectedCategory: string
  categories: Category[]
  accounts: Account[]
  renderCategoryIcon: (catName: string, sizeClass?: string) => React.ReactNode
  renderVariationBadge: (
    percent: number | null,
    absDiff?: number | null,
    isCompact?: boolean
  ) => React.ReactNode
  onViewTransactions?: () => void
}

export function EvolutionMonthDiagnosis({
  data,
  movementType,
  selectedCategory,
  accounts,
  renderCategoryIcon,
  renderVariationBadge,
  onViewTransactions,
}: EvolutionMonthDiagnosisProps) {
  const isExpense = movementType === 'expense'
  const isBalance = movementType === 'balance'
  const isAllCategories = selectedCategory === 'all' || isBalance

  // Max diff for relative impact bars
  const maxDiff = Math.max(
    ...data.topIncreases.map((i) => Math.abs(i.diff)),
    ...data.topDecreases.map((d) => Math.abs(d.diff)),
    1
  )

  const isFavorableChange = isBalance
    ? (data.netAmount ?? data.amount) >= 0
    : isExpense
      ? (data.absoluteChange || 0) <= 0
      : (data.absoluteChange || 0) >= 0

  return (
    <div className="space-y-4 pt-1 pb-2">
      {/* 1. Diagnóstico Narrativo Principal */}
      <div
        className={cn(
          'p-4 rounded-2xl border transition-all text-sm leading-relaxed',
          data.absoluteChange === null && !isBalance
            ? 'bg-muted/40 border-border/60 text-foreground'
            : isFavorableChange
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-xl shrink-0 mt-0.5 shadow-xs',
              data.absoluteChange === null && !isBalance
                ? 'bg-muted text-muted-foreground'
                : isFavorableChange
                  ? 'bg-emerald-500 text-white'
                  : 'bg-rose-500 text-white'
            )}
          >
            {isBalance ? (
              <Scale className="w-4 h-4" />
            ) : data.absoluteChange === null ? (
              <Calendar className="w-4 h-4" />
            ) : isFavorableChange ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider opacity-80">
                Diagnóstico de {data.fullMonthName}
              </span>
              <div>{renderVariationBadge(data.percentageChange, data.absoluteChange)}</div>
            </div>

            <p className="font-medium text-foreground text-xs sm:text-sm">
              {data.summaryExplanation}
            </p>
          </div>
        </div>
      </div>

      {/* 1B. Resumen de Balance (Ingresos vs Gastos) si estamos en modo Balance */}
      {isBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
              Ingresos del mes
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.incomeAmount || 0)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block">
              Gastos del mes
            </span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(data.expenseAmount || 0)}
            </span>
          </div>
          <div
            className={cn(
              'p-3 rounded-xl border space-y-0.5',
              (data.netAmount || 0) >= 0
                ? 'bg-primary/10 border-primary/20'
                : 'bg-rose-500/15 border-rose-500/30'
            )}
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              {data.isCurrentMonth ? 'Balance Previsto' : 'Balance Neto'} ({data.savingsRate !== null && data.savingsRate !== undefined ? `${data.savingsRate}%` : '0%'})
            </span>
            <span
              className={cn(
                'text-base font-black',
                (data.netAmount || 0) >= 0 ? 'text-primary' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {(data.netAmount || 0) > 0 ? '+' : ''}
              {formatCurrency(data.netAmount || 0)}
            </span>
          </div>
        </div>
      )}

      {/* 2. Banner informativo para el Mes en Curso (Doble comparativa: a día de hoy + cierre previsto) */}
      {data.isCurrentMonth && !isBalance && (
        <Card className="border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 rounded-2xl overflow-hidden shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Mes en curso (Día {data.currentDayOfMonth} de {data.daysInMonth})</span>
              </div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold bg-amber-500/10">
                Faltan {Math.max(0, data.daysInMonth - data.currentDayOfMonth)} días para cerrar el mes
              </Badge>
            </div>

            {/* Progreso del mes */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                <span>Progreso temporal del mes</span>
                <span>{Math.round((data.currentDayOfMonth / data.daysInMonth) * 100)}% transcurrido</span>
              </div>
              <Progress
                value={(data.currentDayOfMonth / data.daysInMonth) * 100}
                className="h-1.5 bg-amber-200/50 dark:bg-amber-900/40"
              />
            </div>

            {/* Desglose: Real vs Pendiente vs Total */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-background/80 border border-border/40 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Ejecutado hasta hoy
                </span>
                <span className="text-sm sm:text-base font-extrabold text-foreground">
                  {formatCurrency(data.realAmount)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {data.realTxCount} {isExpense ? 'gastos pagados' : 'ingresos cobrados'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-background/80 border border-border/40 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  Previsto a fin de mes
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400">
                  {formatCurrency(data.pendingAmount)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {data.pendingTxCount} {isExpense ? 'recibos pendientes' : 'pendientes'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-primary block">
                  Total esperado (cierre mes)
                </span>
                <span className="text-sm sm:text-base font-black text-primary">
                  {formatCurrency(data.amount)}
                </span>
                <span className="text-[10px] text-primary/80 block">
                  Ejecutado ({formatCurrency(data.realAmount)}) + Prev ({formatCurrency(data.pendingAmount)})
                </span>
              </div>
            </div>

            {/* Doble Comparativa Homogénea: 1) A día equivalente y 2) Proyección cierre mes vs cierre mes anterior */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {data.mtdPrevAmount !== null && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/30 text-xs gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      <strong>A día {data.currentDayOfMonth}</strong>: {formatCurrency(data.mtdCurrentAmount)} vs{' '}
                      <strong>{formatCurrency(data.mtdPrevAmount)}</strong>
                    </span>
                  </div>
                  <div className="shrink-0">
                    {renderVariationBadge(data.mtdPercentageChange, data.mtdAbsoluteChange, true)}
                  </div>
                </div>
              )}

              {data.fullMonthPrevAmount !== null && data.fullMonthPrevAmount !== undefined && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/30 text-xs gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      <strong>Cierre previsto</strong>: {formatCurrency(data.amount)} vs{' '}
                      <strong>{formatCurrency(data.fullMonthPrevAmount)}</strong>
                    </span>
                  </div>
                  <div className="shrink-0">
                    {renderVariationBadge(
                      data.fullMonthPercentageChange ?? null,
                      data.fullMonthAbsoluteChange ?? null,
                      true
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Desglose de Causas: Todas las categorías vs Categoría individual */}
      {isAllCategories ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Factores al Alza (ordenados por impacto en €) */}
          <Card className="border border-border/50 rounded-2xl bg-card/60 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span
                  className={cn(
                    'font-bold text-xs uppercase tracking-wider flex items-center gap-1.5',
                    isExpense || isBalance
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  {isExpense || isBalance
                    ? 'Partidas con mayor subida (€)'
                    : 'Ingresos con mayor subida (€)'}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {data.isCurrentMonth
                    ? 'previsto vs mes anterior'
                    : 'vs mes anterior'}
                </span>
              </div>

              {data.topIncreases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  Ninguna categoría registró aumento este mes.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topIncreases.map((item) => {
                    const pctBar = maxDiff > 0 ? (Math.abs(item.diff) / maxDiff) * 100 : 0
                    return (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                              {renderCategoryIcon(item.category, 'w-3 h-3')}
                            </div>
                            <span className="font-semibold text-foreground capitalize truncate">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-right">
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                              {formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.percentageDiff !== null && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'font-bold text-[10px] px-1.5 py-0',
                                    isExpense || isBalance
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  )}
                                >
                                  +{item.percentageDiff}%
                                </Badge>
                              )}
                              <span
                                className={cn(
                                  'font-black text-xs',
                                  isExpense || isBalance
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                +{formatCurrency(item.diff)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra visual de impacto */}
                        <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              isExpense || isBalance ? 'bg-rose-500' : 'bg-emerald-500'
                            )}
                            style={{ width: `${Math.max(pctBar, 4)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factores a la Baja (ordenados por impacto en €) */}
          <Card className="border border-border/50 rounded-2xl bg-card/60 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span
                  className={cn(
                    'font-bold text-xs uppercase tracking-wider flex items-center gap-1.5',
                    isExpense || isBalance
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  <TrendingDown className="w-4 h-4" />
                  {isExpense || isBalance
                    ? 'Partidas con mayor ahorro / bajada (€)'
                    : 'Ingresos que disminuyeron (€)'}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {data.isCurrentMonth
                    ? 'previsto vs mes anterior'
                    : 'vs mes anterior'}
                </span>
              </div>

              {data.topDecreases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  Ninguna categoría registró reducción este mes.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topDecreases.map((item) => {
                    const pctBar = maxDiff > 0 ? (Math.abs(item.diff) / maxDiff) * 100 : 0
                    return (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                              {renderCategoryIcon(item.category, 'w-3 h-3')}
                            </div>
                            <span className="font-semibold text-foreground capitalize truncate">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-right">
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                              {formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.percentageDiff !== null && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'font-bold text-[10px] px-1.5 py-0',
                                    isExpense || isBalance
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                  )}
                                >
                                  {item.percentageDiff}%
                                </Badge>
                              )}
                              <span
                                className={cn(
                                  'font-black text-xs',
                                  isExpense || isBalance
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                )}
                              >
                                -{formatCurrency(Math.abs(item.diff))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra visual de impacto */}
                        <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              isExpense || isBalance ? 'bg-emerald-500' : 'bg-rose-500'
                            )}
                            style={{ width: `${Math.max(pctBar, 4)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Categoría específica seleccionada: Diagnóstico de Frecuencia vs Ticket Medio */
        <Card className="border border-border/50 rounded-2xl bg-card/60 shadow-xs">
          <CardContent className="p-4 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Análisis de Comportamiento en {selectedCategory}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-background/80 border border-border/40 space-y-1">
                <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                  Frecuencia de movimientos
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-foreground">{data.txCount} veces</span>
                  {data.prevAmount !== null && (
                    <span className="text-xs text-muted-foreground">
                      (prev: {data.prevTransactions.length})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {data.prevTransactions.length === 0
                    ? 'No hubo movimientos el mes anterior.'
                    : data.txCount > data.prevTransactions.length
                      ? `Registraste ${data.txCount - data.prevTransactions.length} movimiento(s) más que el mes anterior.`
                      : data.txCount < data.prevTransactions.length
                        ? `Registraste ${data.prevTransactions.length - data.txCount} movimiento(s) menos que el mes anterior.`
                        : 'Misma cantidad de movimientos que el mes anterior.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border/40 space-y-1">
                <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                  Importe medio por movimiento
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-foreground">
                    {formatCurrency(data.avgTicket)}
                  </span>
                  {data.prevAvgTicket !== null && (
                    <span className="text-xs text-muted-foreground">
                      (prev: {formatCurrency(data.prevAvgTicket)})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {data.prevAvgTicket === null
                    ? 'Sin referencia del mes previo.'
                    : data.avgTicket > data.prevAvgTicket
                      ? `El ticket promedio subió ${formatCurrency(data.avgTicket - data.prevAvgTicket)} por movimiento.`
                      : data.avgTicket < data.prevAvgTicket
                        ? `El ticket promedio bajó ${formatCurrency(data.prevAvgTicket - data.avgTicket)} por movimiento.`
                        : 'El gasto promedio por movimiento se mantuvo.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Mayores movimientos individuales del mes */}
      {data.topTransactions.length > 0 && (
        <Card className="border border-border/40 rounded-2xl bg-card/40 shadow-xs">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Mayores movimientos registrados en {data.monthLabel}
              </span>
              {onViewTransactions && (
                <button
                  type="button"
                  onClick={onViewTransactions}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Ver todos ({data.txCount})
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {data.topTransactions.slice(0, 3).map((tx) => {
                const account = accounts.find((a) => a.id === tx.accountId)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-background/80 border border-border/30 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                        {renderCategoryIcon(tx.category, 'w-3.5 h-3.5')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-foreground truncate">
                            {tx.description || tx.category}
                          </p>
                          {tx.isPending && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-600 bg-amber-500/10 font-bold"
                            >
                              Previsto
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>{format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}</span>
                          {account && <span>• {account.name}</span>}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'font-black text-sm shrink-0',
                        tx.type === 'expense' ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {tx.type === 'expense' ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
