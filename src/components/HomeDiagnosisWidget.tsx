import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
  Sparkles,
  Repeat,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Transaction, Category, Account } from '@/types/finance'
import { formatCurrency } from '@/lib/calculations'
import { computeHomeDiagnosis } from '@/lib/homePulse'
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

  const diagnosis = useMemo(
    () => computeHomeDiagnosis(transactions, categories),
    [transactions, categories]
  )

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

          {/* Resumen de Gastos Habituales (presentes en ambos meses) */}
          {(diagnosis.comparablePrevTotal > 0 || diagnosis.comparableCurrentTotal > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/80 border border-border/40 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Repeat className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-bold text-foreground">
                  Partidas habituales (en ambos meses):
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(diagnosis.comparablePrevTotal)} →{' '}
                  <strong className="text-foreground">
                    {formatCurrency(diagnosis.comparableCurrentTotal)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {diagnosis.comparablePercentageDiff !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-bold text-[10px] px-1.5 py-0',
                      diagnosis.comparableDiff > 0
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    )}
                  >
                    {diagnosis.comparableDiff > 0 ? '+' : ''}
                    {diagnosis.comparablePercentageDiff}%
                  </Badge>
                )}
                <span
                  className={cn(
                    'font-black text-xs',
                    diagnosis.comparableDiff > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {diagnosis.comparableDiff > 0 ? '+' : ''}
                  {formatCurrency(diagnosis.comparableDiff)}
                </span>
              </div>
            </div>
          )}

          {/* Fila 2: Top 5 Aumentos y Top 5 Descensos en Habituales (ordenados por impacto real en €) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-0.5">
            {/* Top 5 mayor subida en € */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-background/80 border border-border/40">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/30">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Habituales que más suben (%)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  en ambos meses
                </span>
              </div>

              {diagnosis.topIncreases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 text-center">
                  Ninguna categoría habitual subió este mes.
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
                  Habituales con mayor ahorro (%)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  en ambos meses
                </span>
              </div>

              {diagnosis.topDecreases.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 text-center">
                  Ninguna categoría habitual disminuyó este mes.
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

          {/* Fila 2B: Gastos Extras / Puntuales (solo en uno de los meses) */}
          {(diagnosis.currentExtras.length > 0 || diagnosis.prevExtras.length > 0) && (
            <div className="p-3 rounded-2xl bg-background/80 border border-border/40 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-border/30">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Gastos Extras / Puntuales (Solo en uno de los meses)
                </span>
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="text-muted-foreground text-[11px]">
                    {diagnosis.prevMonthName}: <strong>{formatCurrency(diagnosis.extrasPrevTotal)}</strong> →{' '}
                    {diagnosis.currentMonthName}:{' '}
                    <strong className="text-foreground">
                      {formatCurrency(diagnosis.extrasCurrentTotal)}
                    </strong>
                  </span>
                  {diagnosis.extrasPercentageDiff !== null && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-bold text-[10px] px-1.5 py-0',
                        diagnosis.extrasDiff > 0
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      )}
                    >
                      {diagnosis.extrasDiff > 0 ? '+' : ''}
                      {diagnosis.extrasPercentageDiff}%
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'font-black text-xs',
                      diagnosis.extrasDiff > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {diagnosis.extrasDiff > 0 ? '+' : ''}
                    {formatCurrency(diagnosis.extrasDiff)}
                  </span>
                </div>
              </div>

              {diagnosis.comparableDiff < -0.01 && diagnosis.extrasDiff > 0.01 && (
                <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                  💡 En tus gastos habituales ahorras{' '}
                  <strong>{formatCurrency(Math.abs(diagnosis.comparableDiff))}</strong>, pero los
                  gastos extras suben <strong>+{formatCurrency(diagnosis.extrasDiff)}</strong>{' '}
                  {diagnosis.extrasDiff > Math.abs(diagnosis.comparableDiff)
                    ? '(absorbiendo todo el ahorro).'
                    : '(reduciendo parte de ese ahorro).'}
                </div>
              )}

              {diagnosis.comparableDiff > 0.01 && diagnosis.extrasDiff < -0.01 && (
                <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                  💡 Este mes bajan los gastos extras en{' '}
                  <strong>-{formatCurrency(Math.abs(diagnosis.extrasDiff))}</strong>, pero tus
                  gastos habituales suben <strong>+{formatCurrency(diagnosis.comparableDiff)}</strong>.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Extras de este mes */}
                <div className="p-2.5 rounded-xl bg-background/90 border border-border/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1">
                    <span>Nuevos este mes ({diagnosis.currentExtras.length})</span>
                    <span className="text-rose-600 dark:text-rose-400 font-black text-xs">
                      {formatCurrency(diagnosis.extrasCurrentTotal)}
                    </span>
                  </div>
                  {diagnosis.currentExtras.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic py-1">
                      Sin gastos puntuales nuevos este mes.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {diagnosis.currentExtras.map((item) => (
                        <div
                          key={item.category}
                          onClick={() =>
                            navigate({
                              to: '/evolucion',
                              search: { category: item.category } as any,
                            })
                          }
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center shrink-0">
                              {renderCategoryIcon(item.category, 'w-2.5 h-2.5')}
                            </div>
                            <span className="font-medium text-foreground capitalize truncate">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                            {formatCurrency(item.currentAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Extras del mes anterior */}
                <div className="p-2.5 rounded-xl bg-background/90 border border-border/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1">
                    <span>Solo en {diagnosis.prevMonthName} ({diagnosis.prevExtras.length})</span>
                    <span className="text-muted-foreground font-black text-xs">
                      {formatCurrency(diagnosis.extrasPrevTotal)}
                    </span>
                  </div>
                  {diagnosis.prevExtras.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic py-1">
                      Todas las partidas del mes anterior se repiten este mes.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {diagnosis.prevExtras.map((item) => (
                        <div
                          key={item.category}
                          onClick={() =>
                            navigate({
                              to: '/evolucion',
                              search: { category: item.category } as any,
                            })
                          }
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center shrink-0">
                              {renderCategoryIcon(item.category, 'w-2.5 h-2.5')}
                            </div>
                            <span className="font-medium text-muted-foreground capitalize truncate">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-muted-foreground shrink-0">
                            {formatCurrency(item.prevAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
