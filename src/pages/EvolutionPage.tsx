import { useState, useMemo, useEffect } from 'react'
import { format, parseISO, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Wallet,
  BarChart3,
  Layers,
  Tag,
  Info,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/calculations'
import { Transaction, Category, TransactionType } from '@/types/finance'
import { cn } from '@/lib/utils'

type TimeframeOption = '3m' | '6m' | '12m' | 'all'
type ChartMode = 'area' | 'bar'

interface MonthEvolutionData {
  monthKey: string
  monthLabel: string
  fullMonthName: string
  amount: number
  prevAmount: number | null
  percentageChange: number | null
  absoluteChange: number | null
  txCount: number
  transactions: Transaction[]
}

export default function EvolutionPage() {
  const { transactions } = useTransactions()
  const { categories } = useCategories()
  const { accounts } = useAccounts()

  const [movementType, setMovementType] = useState<TransactionType>('expense')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [timeframe, setTimeframe] = useState<TimeframeOption>('6m')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [chartMode, setChartMode] = useState<ChartMode>('area')
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  // Helper to check transfer category
  const isTransfer = (category: string) => {
    const normalized = category
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normalized === 'transferencia'
  }

  // Extract all valid transactions for current movementType (expense or income)
  const validTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.type === movementType && !t.isPending && !isTransfer(t.category)
    )
  }, [transactions, movementType])

  // Available categories strictly separated by movementType (expense or income)
  const availableCategories = useMemo(() => {
    const totals: Record<string, number> = {}
    validTransactions.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount
    })

    // Track which categories have been used for each type across transactions
    const incomeCats = new Set<string>()
    const expenseCats = new Set<string>()
    transactions.forEach((t) => {
      if (!isTransfer(t.category)) {
        if (t.type === 'income') incomeCats.add(t.category)
        if (t.type === 'expense') expenseCats.add(t.category)
      }
    })

    let filteredNames: string[] = []

    if (movementType === 'income') {
      // For Incomes: ONLY categories with income transactions or catalog categories explicitly for income
      const catalogIncome = categories
        .map((c: any) => (typeof c === 'string' ? c : c.name))
        .filter((name: string) => {
          const lower = name.toLowerCase()
          return (
            lower.includes('nómina') ||
            lower.includes('nomina') ||
            lower.includes('sueldo') ||
            lower.includes('ingreso') ||
            lower.includes('venta') ||
            lower.includes('rendimiento') ||
            (incomeCats.has(name) && !expenseCats.has(name))
          )
        })

      filteredNames = Array.from(new Set([...Object.keys(totals), ...catalogIncome])).filter(
        (name) => !expenseCats.has(name) || incomeCats.has(name)
      )
    } else {
      // For Expenses: ONLY categories with expense transactions or catalog categories not strictly for income
      const catalogExpense = categories
        .map((c: any) => (typeof c === 'string' ? c : c.name))
        .filter((name: string) => {
          const lower = name.toLowerCase()
          const isIncomeName =
            lower.includes('nómina') ||
            lower.includes('nomina') ||
            lower.includes('sueldo') ||
            (incomeCats.has(name) && !expenseCats.has(name))
          return !isIncomeName
        })

      filteredNames = Array.from(new Set([...Object.keys(totals), ...catalogExpense])).filter(
        (name) => !incomeCats.has(name) || expenseCats.has(name)
      )
    }

    return filteredNames
      .filter((name) => Boolean(name) && !isTransfer(name))
      .sort((a, b) => {
        const totalA = totals[a] || 0
        const totalB = totals[b] || 0
        if (totalB !== totalA) return totalB - totalA // Higher volume first
        return a.localeCompare(b)
      })
  }, [validTransactions, transactions, categories, movementType])

  // When movementType or availableCategories change, reset category selection to first available of this type
  useEffect(() => {
    if (availableCategories.length > 0) {
      if (
        !selectedCategory ||
        (selectedCategory !== 'all' && !availableCategories.includes(selectedCategory))
      ) {
        setSelectedCategory(availableCategories[0])
      }
    } else if (selectedCategory !== 'all') {
      setSelectedCategory('all')
    }
  }, [movementType, availableCategories, selectedCategory])

  // Get active category object for color and icon
  const activeCategoryObj: Category | undefined = useMemo(() => {
    return categories.find((c: any) => {
      const name = typeof c === 'string' ? c : c.name
      return name.toLowerCase() === selectedCategory.toLowerCase()
    })
  }, [categories, selectedCategory])

  const defaultTypeColor = movementType === 'income' ? '#10b981' : '#f43f5e'
  const activeColor = activeCategoryObj?.color || defaultTypeColor

  // Compute evolution timeline data
  const evolutionData: MonthEvolutionData[] = useMemo(() => {
    if (validTransactions.length === 0) return []

    // Filter by selected category (or all) and account
    const filtered = validTransactions.filter((t) => {
      const matchCat =
        selectedCategory === 'all' || t.category.toLowerCase() === selectedCategory.toLowerCase()
      const matchAcc = selectedAccountId === 'all' || t.accountId === selectedAccountId
      return matchCat && matchAcc
    })

    // Group transactions by monthKey "yyyy-MM"
    const monthTxMap = new Map<string, Transaction[]>()
    filtered.forEach((t) => {
      const date = parseISO(t.date)
      const monthKey = format(startOfMonth(date), 'yyyy-MM')
      const existing = monthTxMap.get(monthKey) || []
      existing.push(t)
      monthTxMap.set(monthKey, existing)
    })

    // Determine date bounds
    const now = new Date()
    const currentMonthDate = startOfMonth(now)

    let monthsCount = 6
    if (timeframe === '3m') monthsCount = 3
    if (timeframe === '6m') monthsCount = 6
    if (timeframe === '12m') monthsCount = 12

    let startDate: Date
    if (timeframe === 'all') {
      if (filtered.length > 0) {
        const sortedDates = filtered
          .map((t) => parseISO(t.date))
          .sort((a, b) => a.getTime() - b.getTime())
        startDate = startOfMonth(sortedDates[0])
      } else {
        startDate = subMonths(currentMonthDate, 5)
      }
    } else {
      startDate = subMonths(currentMonthDate, monthsCount - 1)
    }

    // We also need 1 extra previous month before startDate to calculate variation for the first month
    const rangeStartDateWithBaseline = subMonths(startDate, 1)
    const allMonthsInterval = eachMonthOfInterval({
      start: rangeStartDateWithBaseline,
      end: currentMonthDate,
    })

    const fullMonthsTimeline = allMonthsInterval.map((date) => {
      const monthKey = format(date, 'yyyy-MM')
      const txs = monthTxMap.get(monthKey) || []
      const amount = txs.reduce((sum, t) => sum + t.amount, 0)
      return {
        date,
        monthKey,
        monthLabel: format(date, 'MMM yy', { locale: es }),
        fullMonthName: format(date, 'MMMM yyyy', { locale: es }),
        amount,
        transactions: txs.sort((a, b) => b.date.localeCompare(a.date)),
        txCount: txs.length,
      }
    })

    // Calculate percentage change month over month
    const resultWithVariations: MonthEvolutionData[] = []

    for (let i = 1; i < fullMonthsTimeline.length; i++) {
      const current = fullMonthsTimeline[i]
      const previous = fullMonthsTimeline[i - 1]
      const prevAmount = previous.amount
      const amount = current.amount
      const absoluteChange = amount - prevAmount

      let percentageChange: number | null = null
      if (prevAmount > 0) {
        percentageChange = ((amount - prevAmount) / prevAmount) * 100
      } else if (prevAmount === 0 && amount > 0) {
        percentageChange = 100
      } else if (prevAmount === 0 && amount === 0) {
        percentageChange = 0
      }

      resultWithVariations.push({
        monthKey: current.monthKey,
        monthLabel: current.monthLabel,
        fullMonthName: current.fullMonthName,
        amount: Number(amount.toFixed(2)),
        prevAmount: Number(prevAmount.toFixed(2)),
        percentageChange: percentageChange !== null ? Number(percentageChange.toFixed(1)) : null,
        absoluteChange: Number(absoluteChange.toFixed(2)),
        txCount: current.txCount,
        transactions: current.transactions,
      })
    }

    return resultWithVariations
  }, [validTransactions, selectedCategory, selectedAccountId, timeframe])

  // Overall Statistics for active view
  const stats = useMemo(() => {
    if (evolutionData.length === 0) {
      return {
        latestMonth: null,
        latestAmount: 0,
        latestPercentChange: null,
        latestAbsoluteChange: 0,
        averageMonthly: 0,
        peakMonth: null,
        peakAmount: 0,
        totalPeriod: 0,
        totalTransactions: 0,
      }
    }

    const latest = evolutionData[evolutionData.length - 1]
    const totalPeriod = evolutionData.reduce((sum, item) => sum + item.amount, 0)
    const averageMonthly = evolutionData.length > 0 ? totalPeriod / evolutionData.length : 0
    const totalTransactions = evolutionData.reduce((sum, item) => sum + item.txCount, 0)

    let peakMonth = evolutionData[0]
    let peakAmount = evolutionData[0]?.amount || 0

    evolutionData.forEach((item) => {
      if (item.amount > peakAmount) {
        peakAmount = item.amount
        peakMonth = item
      }
    })

    return {
      latestMonth: latest,
      latestAmount: latest.amount,
      latestPercentChange: latest.percentageChange,
      latestAbsoluteChange: latest.absoluteChange || 0,
      averageMonthly,
      peakMonth,
      peakAmount,
      totalPeriod,
      totalTransactions,
    }
  }, [evolutionData])

  // Helper for category icon
  const renderCategoryIcon = (catName: string, sizeClass = 'w-5 h-5') => {
    if (catName === 'all') {
      return <Layers className={sizeClass} />
    }
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

  // Helper for Variation Badge with smart financial coloring
  const renderVariationBadge = (
    percent: number | null,
    absDiff?: number | null,
    isCompact = false
  ) => {
    if (percent === null) {
      return (
        <Badge
          variant="outline"
          className="font-semibold text-xs text-muted-foreground bg-muted/40"
        >
          <Minus className="w-3 h-3 mr-1" />
          Base
        </Badge>
      )
    }

    if (percent === 0) {
      return (
        <Badge
          variant="outline"
          className="font-semibold text-xs text-muted-foreground bg-muted/40"
        >
          <Minus className="w-3 h-3 mr-1" />
          0%
        </Badge>
      )
    }

    const isIncrease = percent > 0

    // For Expenses: increase is unfavorable (red), decrease is favorable (green)
    // For Incomes: increase is favorable (green), decrease is unfavorable (red)
    const isFavorable = movementType === 'expense' ? !isIncrease : isIncrease

    const colorClass = isFavorable
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-bold rounded-lg border px-2 py-0.5 text-xs transition-colors',
          colorClass
        )}
      >
        {isIncrease ? (
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>
          {isIncrease ? '+' : ''}
          {percent}%
        </span>
        {!isCompact && absDiff !== undefined && absDiff !== null && (
          <span className="opacity-80 text-[11px] font-medium hidden sm:inline">
            ({isIncrease ? '+' : ''}
            {formatCurrency(absDiff)})
          </span>
        )}
      </span>
    )
  }

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: MonthEvolutionData = payload[0].payload
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 shadow-xl rounded-xl p-3 text-xs space-y-1.5 min-w-[170px] pointer-events-none">
          <div className="font-bold text-foreground capitalize flex items-center justify-between border-b border-border/40 pb-1">
            <span>{data.fullMonthName}</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {data.txCount}{' '}
              {data.txCount === 1
                ? movementType === 'expense'
                  ? 'gasto'
                  : 'ingreso'
                : movementType === 'expense'
                  ? 'gastos'
                  : 'ingresos'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-muted-foreground">
              {movementType === 'expense' ? 'Gasto total:' : 'Ingreso total:'}
            </span>
            <span className="font-extrabold text-foreground text-sm">
              {formatCurrency(data.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Variación mensual:</span>
            <div>{renderVariationBadge(data.percentageChange, data.absoluteChange, true)}</div>
          </div>
        </div>
      )
    }
    return null
  }

  const isExpense = movementType === 'expense'

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header, Movement Switcher & Timeframe Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1">
            <Activity className="w-4 h-4" />
            <span>Tendencias y Variaciones Temporales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Evolución de {isExpense ? 'Gastos' : 'Ingresos'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Analiza el comportamiento y la variación porcentual mes a mes por categoría.
          </p>
        </div>

        {/* Controls: Type switcher + Timeframe */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Gastos vs Ingresos Pill Switcher */}
          <div className="flex items-center bg-muted/70 p-1 rounded-2xl border border-border/50 shadow-xs">
            <button
              onClick={() => setMovementType('expense')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all',
                isExpense
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Gastos</span>
            </button>
            <button
              onClick={() => setMovementType('income')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all',
                !isExpense
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Ingresos</span>
            </button>
          </div>

          {/* Timeframe selector pill buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/40">
            {(['3m', '6m', '12m', 'all'] as TimeframeOption[]).map((tf) => {
              const labels: Record<TimeframeOption, string> = {
                '3m': '3 meses',
                '6m': '6 meses',
                '12m': '1 año',
                all: 'Histórico',
              }
              const isSelected = timeframe === tf
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-xl transition-all',
                    isSelected
                      ? 'bg-background text-foreground shadow-sm shadow-black/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                  )}
                >
                  {labels[tf]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter Bar: Category and Account Selectors */}
      <Card className="border border-border/40 shadow-sm bg-card/60 backdrop-blur-sm rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
            {/* Category selector */}
            <div className="lg:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Categoría de {isExpense ? 'Gasto' : 'Ingreso'} a analizar
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-background border-border/60 text-sm font-semibold">
                  <div className="flex items-center gap-2 truncate">
                    {selectedCategory && (
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{
                          backgroundColor: selectedCategory === 'all' ? '#64748b' : activeColor,
                        }}
                      >
                        {renderCategoryIcon(selectedCategory, 'w-3.5 h-3.5')}
                      </div>
                    )}
                    <span className="capitalize truncate">
                      {selectedCategory === 'all'
                        ? `Todas las Categorías (${isExpense ? 'Gasto Total' : 'Ingreso Total'})`
                        : selectedCategory || 'Seleccionar Categoría'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="font-bold py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-500 text-white flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span>
                        Todas las Categorías ({isExpense ? 'Gasto Total' : 'Ingreso Total'})
                      </span>
                    </div>
                  </SelectItem>
                  {availableCategories.map((catName) => {
                    const catObj = categories.find(
                      (c: any) => (typeof c === 'string' ? c : c.name) === catName
                    )
                    const color = catObj?.color || defaultTypeColor
                    return (
                      <SelectItem
                        key={catName}
                        value={catName}
                        className="py-2 capitalize font-medium"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]"
                            style={{ backgroundColor: color }}
                          >
                            {renderCategoryIcon(catName, 'w-3 h-3')}
                          </div>
                          <span>{catName}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Account filter */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Cuenta vinculada
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-background border-border/60 text-sm font-semibold">
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-semibold">
                    Todas las cuentas
                  </SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Último Mes & Variación vs anterior */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Último Mes ({stats.latestMonth?.monthLabel || 'N/A'})
              </span>
              <div
                className={cn(
                  'p-2 rounded-xl',
                  isExpense
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {formatCurrency(stats.latestAmount)}
            </div>
            <div className="pt-1 flex items-center gap-2 flex-wrap">
              {renderVariationBadge(stats.latestPercentChange, stats.latestAbsoluteChange)}
              <span className="text-[11px] text-muted-foreground">vs mes previo</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Promedio Mensual */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Promedio Mensual
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {formatCurrency(stats.averageMonthly)}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
              <span>Periodo de {evolutionData.length} meses analizados</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Mes Pico (Máximo) */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pico Más Alto
              </span>
              <div
                className={cn(
                  'p-2 rounded-xl',
                  isExpense
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {isExpense ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {formatCurrency(stats.peakAmount)}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 capitalize truncate">
              {stats.peakMonth ? stats.peakMonth.fullMonthName : 'Sin datos'}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total del Periodo & Movimientos */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Acumulado
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {formatCurrency(stats.totalPeriod)}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>
                {stats.totalTransactions}{' '}
                {isExpense ? 'gastos registrados' : 'ingresos registrados'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Section */}
      <Card className="border border-border/40 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity
                className={cn('w-4 h-4', isExpense ? 'text-rose-500' : 'text-emerald-500')}
              />
              Evolución Temporal de {isExpense ? 'Gastos' : 'Ingresos'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Curva mes a mes con indicadores de variación porcentual
            </p>
          </div>

          {/* Chart mode toggle (Area vs Bar) */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/40">
            <button
              onClick={() => setChartMode('area')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                chartMode === 'area'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Línea</span>
            </button>
            <button
              onClick={() => setChartMode('bar')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                chartMode === 'bar'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Barras</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-4">
          {evolutionData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Info className="w-8 h-8 opacity-40" />
              <p className="text-sm">
                No se encontraron transacciones para los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'area' ? (
                  <AreaChart
                    data={evolutionData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="evolutionAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeColor} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={activeColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-muted-foreground capitalize"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      tickFormatter={(val) =>
                        `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                      }
                      className="text-muted-foreground"
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {stats.averageMonthly > 0 && (
                      <ReferenceLine
                        y={stats.averageMonthly}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Media: ${formatCurrency(stats.averageMonthly)}`,
                          position: 'top',
                          fill: '#94a3b8',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={activeColor}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#evolutionAreaGradient)"
                      activeDot={{
                        r: 6,
                        stroke: '#ffffff',
                        strokeWidth: 2,
                        fill: activeColor,
                      }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={evolutionData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-muted-foreground capitalize"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      tickFormatter={(val) =>
                        `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                      }
                      className="text-muted-foreground"
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {stats.averageMonthly > 0 && (
                      <ReferenceLine
                        y={stats.averageMonthly}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Media: ${formatCurrency(stats.averageMonthly)}`,
                          position: 'top',
                          fill: '#94a3b8',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Bar
                      dataKey="amount"
                      fill={activeColor}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown & Detailed Transaction Accordion */}
      <Card className="border border-border/40 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Desglose Cronológico y Variación Mensual
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Toca cualquier mes para ver los movimientos registrados.
              </p>
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              Mostrando {evolutionData.length} meses
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="divide-y divide-border/40">
            {/* Reverse to show most recent month at top */}
            {[...evolutionData].reverse().map((item) => {
              const isExpanded = expandedMonth === item.monthKey
              const peakPct = stats.peakAmount > 0 ? (item.amount / stats.peakAmount) * 100 : 0

              return (
                <div
                  key={item.monthKey}
                  className="py-3.5 transition-colors hover:bg-muted/20 rounded-xl px-2"
                >
                  <div
                    onClick={() => setExpandedMonth(isExpanded ? null : item.monthKey)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: Month name and progress bar */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base capitalize text-foreground">
                          {item.fullMonthName}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                          {item.txCount}{' '}
                          {item.txCount === 1
                            ? isExpense
                              ? 'movimiento'
                              : 'ingreso'
                            : isExpense
                              ? 'movimientos'
                              : 'ingresos'}
                        </span>
                      </div>

                      {/* Visual volume relative bar */}
                      <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(peakPct, 2)}%`,
                            backgroundColor: activeColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Amount & Variation Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-black text-sm sm:text-base text-foreground tracking-tight">
                          {formatCurrency(item.amount)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {item.prevAmount !== null && (
                            <span>prev: {formatCurrency(item.prevAmount)}</span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-[90px] flex justify-end">
                        {renderVariationBadge(item.percentageChange, item.absoluteChange)}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground shrink-0 rounded-full"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Transaction List */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/30 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          {isExpense ? 'Gastos' : 'Ingresos'} registrados en {item.fullMonthName}:
                        </div>
                        {item.transactions.length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2 px-1 italic">
                            No hay movimientos registrados en este mes.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {item.transactions.map((tx) => {
                              const account = accounts.find((a) => a.id === tx.accountId)
                              return (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-background/80 border border-border/30 text-xs hover:border-border/60 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                                      <Receipt className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-foreground truncate">
                                        {tx.description || tx.category}
                                      </p>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span>
                                          {format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}
                                        </span>
                                        {account && (
                                          <>
                                            <span>•</span>
                                            <span>{account.name}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      'font-bold text-right shrink-0',
                                      isExpense
                                        ? 'text-foreground'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    )}
                                  >
                                    {isExpense ? '' : '+'}
                                    {formatCurrency(tx.amount)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
