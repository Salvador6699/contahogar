import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format,
  parseISO,
  startOfMonth,
  subMonths,
  eachMonthOfInterval,
  isSameMonth,
  getDate,
  getDaysInMonth,
} from 'date-fns'
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
  Scale,
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
import { useSearchParams } from '@/hooks/useSearchParams'
import { formatCurrency, isTransfer } from '@/lib/calculations'
import {
  Transaction,
  Category,
  getCategoryKind,
  getCategoryNature,
  isFinancingCategory,
} from '@/types/finance'
import { cn } from '@/lib/utils'
import {
  EvolutionMonthDiagnosis,
  MonthEvolutionData,
  CategoryDiff,
} from '@/components/EvolutionMonthDiagnosis'

type MovementMode = 'expense' | 'income' | 'balance'
type TimeframeOption = '3m' | '6m' | '12m' | 'all'
type ChartMode = 'area' | 'bar'

const normalizeCatKey = (name: string) => name.trim().toLowerCase()

export default function EvolutionPage() {
  const { transactions } = useTransactions()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const [searchParams] = useSearchParams()

  const initialModeParam = searchParams.get('mode')
  const initialMode: MovementMode =
    initialModeParam === 'income' || initialModeParam === 'balance'
      ? initialModeParam
      : 'expense'

  const [movementType, setMovementType] = useState<MovementMode>(initialMode)
  const isExpense = movementType === 'expense'
  const isIncome = movementType === 'income'
  const isBalance = movementType === 'balance'

  // Por defecto arranca en "all" ("Todas las Categorías"), salvo que venga filtrada por URL
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  )
  const [timeframe, setTimeframe] = useState<TimeframeOption>('6m')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [chartMode, setChartMode] = useState<ChartMode>('area')
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [monthTabs, setMonthTabs] = useState<Record<string, 'diagnosis' | 'transactions'>>({})

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    const catParam = searchParams.get('category')
    if (modeParam === 'expense' || modeParam === 'income' || modeParam === 'balance') {
      setMovementType(modeParam)
    }
    if (catParam) {
      setSelectedCategory(catParam)
    }
  }, [searchParams])

  const getMonthTab = (monthKey: string) => monthTabs[monthKey] || 'diagnosis'
  const setMonthTab = (monthKey: string, tab: 'diagnosis' | 'transactions') =>
    setMonthTabs((prev) => ({ ...prev, [monthKey]: tab }))

  const currentMonthKey = useMemo(() => format(new Date(), 'yyyy-MM'), [])

  // Resolver nombre canónico de categoría (insensible a mayúsculas/espacios)
  const resolveCanonicalCategory = useCallback(
    (rawName: string): string => {
      const trimmed = rawName.trim()
      const targetKey = normalizeCatKey(trimmed)
      const match = categories.find((c: any) => {
        const name = typeof c === 'string' ? c : c.name
        return normalizeCatKey(name) === targetKey
      })
      if (match) {
        return typeof match === 'string' ? (match as any).trim() : (match as any).name.trim()
      }
      return trimmed
    },
    [categories]
  )

  // Transacciones válidas hasta el mes actual (sin transferencias, sin financiación, sin meses futuros)
  const baseValidTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (isTransfer(t.category)) return false
      if (isFinancingCategory(t.category, categories)) return false
      if (t.amount <= 0) return false
      const txMonth = t.date.slice(0, 7)
      // Ignorar meses futuros proyectados
      if (txMonth > currentMonthKey) return false
      // En meses pasados cerrados, ignorar transacciones previstas no confirmadas
      if (txMonth < currentMonthKey && t.isPending) return false
      // En el mes actual, respetar isIgnored en pendientes
      if (t.isPending && t.isIgnored) return false
      if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false
      return true
    })
  }, [transactions, categories, currentMonthKey, selectedAccountId])

  // Extract all valid transactions for current movementType
  const validTransactions = useMemo(() => {
    if (isBalance) return baseValidTransactions
    return baseValidTransactions.filter((t) => t.type === movementType)
  }, [baseValidTransactions, movementType, isBalance])

  // Available categories strictly separated by movementType (expense or income), normalized case-insensitively
  const availableCategories = useMemo(() => {
    if (isBalance) return []

    const totals: Record<string, number> = {}
    const canonicalByNorm: Record<string, string> = {}

    validTransactions.forEach((t) => {
      const norm = normalizeCatKey(t.category)
      const canonical = canonicalByNorm[norm] || resolveCanonicalCategory(t.category)
      canonicalByNorm[norm] = canonical
      totals[norm] = (totals[norm] || 0) + t.amount
    })

    const incomeCats = new Set<string>()
    const expenseCats = new Set<string>()
    baseValidTransactions.forEach((t) => {
      const norm = normalizeCatKey(t.category)
      if (!canonicalByNorm[norm]) {
        canonicalByNorm[norm] = resolveCanonicalCategory(t.category)
      }
      if (t.type === 'income') incomeCats.add(norm)
      if (t.type === 'expense') expenseCats.add(norm)
    })

    categories.forEach((c: any) => {
      const raw = typeof c === 'string' ? c : c.name
      const norm = normalizeCatKey(raw)
      if (!canonicalByNorm[norm]) canonicalByNorm[norm] = raw.trim()
    })

    let filteredNormKeys: string[] = []

    if (movementType === 'income') {
      const catalogIncome = Object.keys(canonicalByNorm).filter((norm) => {
        const kind = getCategoryKind(canonicalByNorm[norm], categories)
        if (kind === 'financing') return false
        if (kind === 'income') return true
        return (
          norm.includes('nómina') ||
          norm.includes('nomina') ||
          norm.includes('sueldo') ||
          norm.includes('ingreso') ||
          norm.includes('venta') ||
          norm.includes('rendimiento') ||
          (incomeCats.has(norm) && !expenseCats.has(norm))
        )
      })

      filteredNormKeys = Array.from(new Set([...Object.keys(totals), ...catalogIncome])).filter(
        (norm) =>
          getCategoryKind(canonicalByNorm[norm], categories) !== 'financing' &&
          (!expenseCats.has(norm) || incomeCats.has(norm))
      )
    } else {
      const catalogExpense = Object.keys(canonicalByNorm).filter((norm) => {
        const kind = getCategoryKind(canonicalByNorm[norm], categories)
        if (kind === 'financing' || kind === 'income') return false
        const isIncomeName =
          norm.includes('nómina') ||
          norm.includes('nomina') ||
          norm.includes('sueldo') ||
          (incomeCats.has(norm) && !expenseCats.has(norm))
        return !isIncomeName
      })

      filteredNormKeys = Array.from(new Set([...Object.keys(totals), ...catalogExpense])).filter(
        (norm) =>
          getCategoryKind(canonicalByNorm[norm], categories) !== 'financing' &&
          (!incomeCats.has(norm) || expenseCats.has(norm))
      )
    }

    return filteredNormKeys
      .map((norm) => canonicalByNorm[norm])
      .filter((name) => Boolean(name) && !isTransfer(name))
      .sort((a, b) => {
        const totalA = totals[normalizeCatKey(a)] || 0
        const totalB = totals[normalizeCatKey(b)] || 0
        if (totalB !== totalA) return totalB - totalA
        return a.localeCompare(b)
      })
  }, [validTransactions, baseValidTransactions, categories, movementType, isBalance, resolveCanonicalCategory])

  // Available parent groups for current movementType (sorted by total in validTransactions)
  const availableGroups = useMemo(() => {
    if (isBalance) return []
    const groups = categories.filter((c) => {
      if (!c.isGroup) return false
      const k = c.kind || 'expense'
      if (k === 'financing') return false
      return movementType === 'income' ? k === 'income' : k === 'expense'
    })

    const groupTotals = new Map<string, number>()
    validTransactions.forEach((t) => {
      const catObj = categories.find(
        (c) => !c.isGroup && normalizeCatKey(c.name) === normalizeCatKey(t.category)
      )
      if (catObj?.parentId) {
        groupTotals.set(catObj.parentId, (groupTotals.get(catObj.parentId) || 0) + t.amount)
      }
    })

    return [...groups].sort((a, b) => {
      const ta = groupTotals.get(a.id) || 0
      const tb = groupTotals.get(b.id) || 0
      if (tb !== ta) return tb - ta
      return a.name.localeCompare(b.name)
    })
  }, [categories, movementType, isBalance, validTransactions])

  // Subcategories (excluding group headers) filtered by selectedGroupId
  const filteredSubcategories = useMemo(() => {
    const groupNorms = new Set(availableGroups.map((g) => normalizeCatKey(g.name)))
    const leafCats = availableCategories.filter((name) => !groupNorms.has(normalizeCatKey(name)))
    if (selectedGroupId === 'all') return leafCats
    return leafCats.filter((name) => {
      const catObj = categories.find(
        (c) => !c.isGroup && normalizeCatKey(c.name) === normalizeCatKey(name)
      )
      return catObj?.parentId === selectedGroupId
    })
  }, [availableCategories, availableGroups, selectedGroupId, categories])

  // Keep selectedGroupId synchronized when selectedCategory or movementType changes
  useEffect(() => {
    if (isBalance) {
      if (selectedGroupId !== 'all') setSelectedGroupId('all')
      return
    }
    if (selectedCategory === 'all') {
      if (selectedGroupId !== 'all') setSelectedGroupId('all')
      return
    }
    const selNorm = normalizeCatKey(selectedCategory)
    const matchedGroup = availableGroups.find((g) => normalizeCatKey(g.name) === selNorm)
    if (matchedGroup) {
      if (selectedGroupId !== matchedGroup.id) setSelectedGroupId(matchedGroup.id)
      return
    }
    const matchedCat = categories.find((c) => !c.isGroup && normalizeCatKey(c.name) === selNorm)
    if (matchedCat?.parentId && availableGroups.some((g) => g.id === matchedCat.parentId)) {
      if (selectedGroupId !== matchedCat.parentId) setSelectedGroupId(matchedCat.parentId)
    } else if (selectedGroupId !== 'all') {
      setSelectedGroupId('all')
    }
  }, [selectedCategory, movementType, isBalance, availableGroups, categories])

  // Si la categoría seleccionada no existe al cambiar de modo, volver siempre a 'all'
  useEffect(() => {
    if (isBalance) {
      if (selectedCategory !== 'all') setSelectedCategory('all')
      return
    }
    if (
      !selectedCategory ||
      (selectedCategory !== 'all' &&
        !availableCategories.some((c) => normalizeCatKey(c) === normalizeCatKey(selectedCategory)))
    ) {
      setSelectedCategory('all')
    }
  }, [movementType, availableCategories, selectedCategory, isBalance])

  // Get active category object for color and icon
  const activeCategoryObj: Category | undefined = useMemo(() => {
    return categories.find((c: any) => {
      const name = typeof c === 'string' ? c : c.name
      return normalizeCatKey(name) === normalizeCatKey(selectedCategory)
    })
  }, [categories, selectedCategory])

  const defaultTypeColor = isBalance ? '#3b82f6' : isIncome ? '#10b981' : '#f43f5e'
  const activeColor =
    selectedCategory === 'all' || isBalance
      ? defaultTypeColor
      : activeCategoryObj?.color || defaultTypeColor

  // Compute evolution timeline data
  const evolutionData: MonthEvolutionData[] = useMemo(() => {
    if (validTransactions.length === 0) return []

    const selectedNorm = normalizeCatKey(selectedCategory)

    // Filter by selected category (or group or all)
    const activeGroupObj = categories.find(
      (c) => c.isGroup && normalizeCatKey(c.name) === selectedNorm
    )
    const groupChildNorms = activeGroupObj
      ? new Set(
          categories
            .filter((c) => c.parentId === activeGroupObj.id)
            .map((c) => normalizeCatKey(c.name))
        )
      : null

    const filtered = validTransactions.filter((t) => {
      if (isBalance || selectedCategory === 'all') return true
      const txNorm = normalizeCatKey(t.category)
      if (groupChildNorms) return groupChildNorms.has(txNorm)
      return txNorm === selectedNorm
    })

    // Group transactions by monthKey "yyyy-MM"
    const monthTxMap = new Map<string, Transaction[]>()
    filtered.forEach((t) => {
      const monthKey = t.date.slice(0, 7)
      const existing = monthTxMap.get(monthKey) || []
      existing.push(t)
      monthTxMap.set(monthKey, existing)
    })

    // Determine date bounds
    const now = new Date()
    const currentMonthDate = startOfMonth(now)

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
      let monthsCount = 6
      if (timeframe === '3m') monthsCount = 3
      if (timeframe === '6m') monthsCount = 6
      if (timeframe === '12m') monthsCount = 12
      startDate = subMonths(currentMonthDate, monthsCount - 1)
    }

    // 1 extra previous month before startDate to calculate variation for the first month
    const rangeStartDateWithBaseline = subMonths(startDate, 1)
    const allMonthsInterval = eachMonthOfInterval({
      start: rangeStartDateWithBaseline,
      end: currentMonthDate,
    })

    const fullMonthsTimeline = allMonthsInterval.map((date) => {
      const monthKey = format(date, 'yyyy-MM')
      const txs = (monthTxMap.get(monthKey) || []).sort((a, b) => b.date.localeCompare(a.date))
      const realTxs = txs.filter((t) => !t.isPending)
      const pendingTxs = txs.filter((t) => t.isPending)

      const incomeTxs = txs.filter((t) => t.type === 'income')
      const expenseTxs = txs.filter((t) => t.type === 'expense')

      const incomeAmount = Number(incomeTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
      const expenseAmount = Number(expenseTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
      const netAmount = Number((incomeAmount - expenseAmount).toFixed(2))

      const natureBreakdown = {
        essential: 0,
        discretionary: 0,
        debt: 0,
        extraordinary: 0,
        unclassified: 0,
      }
      expenseTxs.forEach((t) => {
        const nature = getCategoryNature(t.category, categories)
        if (nature === 'essential') natureBreakdown.essential += t.amount
        else if (nature === 'discretionary') natureBreakdown.discretionary += t.amount
        else if (nature === 'debt') natureBreakdown.debt += t.amount
        else if (nature === 'extraordinary') natureBreakdown.extraordinary += t.amount
        else natureBreakdown.unclassified += t.amount
      })
      natureBreakdown.essential = Number(natureBreakdown.essential.toFixed(2))
      natureBreakdown.discretionary = Number(natureBreakdown.discretionary.toFixed(2))
      natureBreakdown.debt = Number(natureBreakdown.debt.toFixed(2))
      natureBreakdown.extraordinary = Number(natureBreakdown.extraordinary.toFixed(2))
      natureBreakdown.unclassified = Number(natureBreakdown.unclassified.toFixed(2))

      const structuralExpense = Number((expenseAmount - natureBreakdown.extraordinary).toFixed(2))
      const structuralNetAmount = Number((incomeAmount - structuralExpense).toFixed(2))
      const structuralSavingsRate =
        incomeAmount > 0 ? Number(((structuralNetAmount / incomeAmount) * 100).toFixed(1)) : null

      const realAmount = isBalance
        ? Number(
            (
              realTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
              realTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            ).toFixed(2)
          )
        : Number(realTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))

      const pendingAmount = isBalance
        ? Number(
            (
              pendingTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
              pendingTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            ).toFixed(2)
          )
        : Number(pendingTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))

      const amount = isBalance ? netAmount : Number((realAmount + pendingAmount).toFixed(2))

      return {
        date,
        monthKey,
        monthLabel: format(date, 'MMM yy', { locale: es }),
        fullMonthName: format(date, 'MMMM yyyy', { locale: es }),
        amount,
        realAmount,
        pendingAmount,
        incomeAmount,
        expenseAmount,
        netAmount,
        structuralNetAmount,
        structuralSavingsRate,
        natureBreakdown,
        transactions: txs,
        realTxs,
        pendingTxs,
        txCount: txs.length,
        realTxCount: realTxs.length,
        pendingTxCount: pendingTxs.length,
      }
    })

    // Calculate percentage change month over month & compute detailed diagnostics
    const resultWithVariations: MonthEvolutionData[] = []
    const currentDayOfMonth = getDate(now)

    for (let i = 1; i < fullMonthsTimeline.length; i++) {
      const current = fullMonthsTimeline[i]
      const previous = fullMonthsTimeline[i - 1]
      const prevAmount = previous.amount
      const prevRealAmount = previous.realAmount
      const amount = current.amount
      const realAmount = current.realAmount
      const pendingAmount = current.pendingAmount

      const isCurrentMonth = isSameMonth(current.date, now)
      const daysInMonth = getDaysInMonth(current.date)

      // Full-month comparison vs previous closed month (always available)
      const fullMonthAbsoluteChange = Number((amount - prevAmount).toFixed(2))
      let fullMonthPercentageChange: number | null = null
      if (isBalance) {
        if (Math.abs(prevAmount) > 0) {
          fullMonthPercentageChange = Number(
            (((amount - prevAmount) / Math.abs(prevAmount)) * 100).toFixed(1)
          )
        } else if (prevAmount === 0 && amount === 0) {
          fullMonthPercentageChange = 0
        }
      } else {
        if (prevAmount > 0 && amount > 0) {
          fullMonthPercentageChange = Number(
            (((amount - prevAmount) / prevAmount) * 100).toFixed(1)
          )
        } else if (prevAmount === 0 && amount === 0) {
          fullMonthPercentageChange = 0
        }
      }

      // Dato secundario de referencia: Ejecutado hasta hoy vs mismo día del mes anterior
      const targetPrevDay = Math.min(currentDayOfMonth, getDaysInMonth(previous.date))

      const mtdCurrentTxs = isCurrentMonth
        ? current.realTxs
        : current.transactions

      const mtdPrevTxs = isCurrentMonth
        ? previous.transactions.filter((t) => getDate(parseISO(t.date)) <= targetPrevDay)
        : previous.transactions

      const calcTxSum = (list: Transaction[]) => {
        if (!isBalance) return list.reduce((sum, t) => sum + t.amount, 0)
        const inc = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const exp = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return inc - exp
      }

      const mtdCurrentAmount = calcTxSum(mtdCurrentTxs)
      const mtdPrevAmount = calcTxSum(mtdPrevTxs)

      const mtdAbsoluteChange = mtdCurrentAmount - mtdPrevAmount
      let mtdPercentageChange: number | null = null
      if (isBalance) {
        if (Math.abs(mtdPrevAmount) > 0) {
          mtdPercentageChange = ((mtdCurrentAmount - mtdPrevAmount) / Math.abs(mtdPrevAmount)) * 100
        } else if (mtdPrevAmount === 0 && mtdCurrentAmount === 0) {
          mtdPercentageChange = 0
        }
      } else {
        if (mtdPrevAmount > 0 && mtdCurrentAmount > 0) {
          mtdPercentageChange = ((mtdCurrentAmount - mtdPrevAmount) / mtdPrevAmount) * 100
        } else if (mtdPrevAmount === 0 && mtdCurrentAmount === 0) {
          mtdPercentageChange = 0
        }
      }

      // Comparativa principal: siempre usa el Total Previsto del mes (Ejecutado + Gastos/Ingresos Futuros) vs Mes anterior completo
      const absoluteChange = fullMonthAbsoluteChange
      const percentageChange = fullMonthPercentageChange

      // Category breakdown differences usando todo el mes (Ejecutado + Futuros) vs mes anterior completo
      const currentCatTotals: Record<string, number> = {}
      const prevCatTotals: Record<string, number> = {}
      const catDisplayNames: Record<string, string> = {}

      const curTxsForDiff = current.transactions.filter(
        (t) => (isBalance ? t.type === 'expense' : true)
      )
      const prevTxsForDiff = previous.transactions.filter(
        (t) => (isBalance ? t.type === 'expense' : true)
      )

      curTxsForDiff.forEach((t) => {
        const norm = normalizeCatKey(t.category)
        if (!catDisplayNames[norm]) catDisplayNames[norm] = resolveCanonicalCategory(t.category)
        currentCatTotals[norm] = (currentCatTotals[norm] || 0) + t.amount
      })

      prevTxsForDiff.forEach((t) => {
        const norm = normalizeCatKey(t.category)
        if (!catDisplayNames[norm]) catDisplayNames[norm] = resolveCanonicalCategory(t.category)
        prevCatTotals[norm] = (prevCatTotals[norm] || 0) + t.amount
      })

      const allCatNorms = Array.from(
        new Set([...Object.keys(currentCatTotals), ...Object.keys(prevCatTotals)])
      )

      const categoryDiffs: CategoryDiff[] = allCatNorms.map((norm) => {
        const cur = Number((currentCatTotals[norm] || 0).toFixed(2))
        const prev = Number((prevCatTotals[norm] || 0).toFixed(2))
        const diff = Number((cur - prev).toFixed(2))
        let percentageDiff: number | null = null
        // Solo calcular % si estuvo presente en ambos meses (evitar falsos +100% / -100%)
        if (prev > 0 && cur > 0) {
          percentageDiff = Number((((cur - prev) / prev) * 100).toFixed(1))
        }
        return {
          category: catDisplayNames[norm] || norm,
          currentAmount: cur,
          prevAmount: prev,
          diff,
          percentageDiff,
        }
      })

      // Separar categorías Habituales (en ambos meses) vs Extras/Puntuales (solo en un mes)
      const comparableCategories = categoryDiffs.filter(
        (d) => d.prevAmount > 0 && d.currentAmount > 0
      )
      const currentExtras = categoryDiffs
        .filter((d) => d.prevAmount === 0 && d.currentAmount > 0)
        .sort((a, b) => b.currentAmount - a.currentAmount)
      const prevExtras = categoryDiffs
        .filter((d) => d.prevAmount > 0 && d.currentAmount === 0)
        .sort((a, b) => b.prevAmount - a.prevAmount)

      const comparableCurrentTotal = Number(
        comparableCategories.reduce((s, d) => s + d.currentAmount, 0).toFixed(2)
      )
      const comparablePrevTotal = Number(
        comparableCategories.reduce((s, d) => s + d.prevAmount, 0).toFixed(2)
      )
      const comparableDiff = Number((comparableCurrentTotal - comparablePrevTotal).toFixed(2))
      const comparablePercentageDiff =
        comparablePrevTotal > 0 && comparableCurrentTotal > 0
          ? Number((((comparableCurrentTotal - comparablePrevTotal) / comparablePrevTotal) * 100).toFixed(1))
          : comparablePrevTotal === 0 && comparableCurrentTotal === 0
            ? 0
            : null

      const extrasCurrentTotal = Number(
        currentExtras.reduce((s, d) => s + d.currentAmount, 0).toFixed(2)
      )
      const extrasPrevTotal = Number(
        prevExtras.reduce((s, d) => s + d.prevAmount, 0).toFixed(2)
      )
      const extrasDiff = Number((extrasCurrentTotal - extrasPrevTotal).toFixed(2))
      const extrasPercentageDiff =
        extrasPrevTotal > 0 && extrasCurrentTotal > 0
          ? Number((((extrasCurrentTotal - extrasPrevTotal) / extrasPrevTotal) * 100).toFixed(1))
          : extrasPrevTotal === 0 && extrasCurrentTotal === 0
            ? 0
            : null

      // Ordenar habituales por porcentaje (%) de mayor subida / mayor ahorro
      const topIncreases = comparableCategories
        .filter((d) => d.diff > 0.01)
        .sort((a, b) => {
          const pctDiff = (b.percentageDiff ?? 0) - (a.percentageDiff ?? 0)
          if (pctDiff !== 0) return pctDiff
          return b.diff - a.diff
        })
        .slice(0, 5)

      const topDecreases = comparableCategories
        .filter((d) => d.diff < -0.01)
        .sort((a, b) => {
          const pctDiff = (a.percentageDiff ?? 0) - (b.percentageDiff ?? 0)
          if (pctDiff !== 0) return pctDiff
          return a.diff - b.diff
        })
        .slice(0, 5)

      const topTransactions = [...current.transactions]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      const avgTicket = current.txCount > 0 ? Math.abs(amount) / current.txCount : 0
      const prevAvgTicket =
        previous.txCount > 0 && Math.abs(prevAmount) > 0
          ? Math.abs(prevAmount) / previous.txCount
          : null

      const savingsRate =
        current.incomeAmount > 0
          ? Number((((current.incomeAmount - current.expenseAmount) / current.incomeAmount) * 100).toFixed(1))
          : current.expenseAmount > 0
            ? -100
            : 0

      // Build narrative explanation priorizando categorías habituales (comparables) y desglosando extras
      let summaryExplanation = ''
      const extrasSummarySentence =
        extrasCurrentTotal > 0 || extrasPrevTotal > 0
          ? ` En ${isExpense ? 'gastos' : 'ingresos'} extras/puntuales pasaste de ${formatCurrency(extrasPrevTotal)} a ${formatCurrency(extrasCurrentTotal)} (${extrasDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(extrasDiff))}).`
          : ''

      if (isBalance) {
        const netSign = current.netAmount >= 0 ? 'balance previsto positivo' : 'déficit mensual'
        summaryExplanation = `En ${current.fullMonthName} registras un ${netSign} de ${formatCurrency(current.netAmount)} contando cobros y pagos futuros (Ingresos: ${formatCurrency(current.incomeAmount)} vs Gastos: ${formatCurrency(current.expenseAmount)}).`
        if (topIncreases.length > 0) {
          summaryExplanation += ` Mayor incremento en habituales: ${topIncreases[0].category} (+${formatCurrency(topIncreases[0].diff)}).`
        }
      } else if (selectedCategory === 'all') {
        if (isCurrentMonth) {
          if (prevAmount === 0 && amount > 0) {
            summaryExplanation = `Mes en curso: el total previsto (${isExpense ? 'pagado + gastos futuros' : 'cobrado + ingresos futuros'}) es de ${formatCurrency(amount)} (${formatCurrency(realAmount)} ejecutado + ${formatCurrency(pendingAmount)} futuro).`
          } else if (absoluteChange > 0) {
            const causes = topIncreases
              .slice(0, 2)
              .map((c) => `${c.category} (+${formatCurrency(c.diff)})`)
              .join(' y ')
            const pctText = percentageChange !== null ? `un ${Math.abs(percentageChange)}% ` : ''
            summaryExplanation = `El total previsto de ${current.fullMonthName} (${formatCurrency(amount)}) sube ${pctText}(+${formatCurrency(absoluteChange)}) frente a ${previous.fullMonthName} (${formatCurrency(prevAmount)}).`
            if (comparablePrevTotal > 0 || comparableCurrentTotal > 0) {
              summaryExplanation += ` En habituales: ${comparableDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(comparableDiff))}${causes ? ` (destacando ${causes})` : ''}.`
            }
            summaryExplanation += extrasSummarySentence
          } else if (absoluteChange < 0) {
            const relief = topDecreases
              .slice(0, 2)
              .map((c) => `${c.category} (-${formatCurrency(Math.abs(c.diff))})`)
              .join(' y ')
            const pctText = percentageChange !== null ? `un ${Math.abs(percentageChange)}% ` : ''
            summaryExplanation = `El total previsto de ${current.fullMonthName} (${formatCurrency(amount)}) baja ${pctText}(-${formatCurrency(Math.abs(absoluteChange))}) frente a ${previous.fullMonthName} (${formatCurrency(prevAmount)}).`
            if (comparablePrevTotal > 0 || comparableCurrentTotal > 0) {
              summaryExplanation += ` En habituales: ${comparableDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(comparableDiff))}${relief ? ` (mayor ahorro en ${relief})` : ''}.`
            }
            summaryExplanation += extrasSummarySentence
          } else {
            summaryExplanation = `El total previsto de ${current.fullMonthName} (${formatCurrency(amount)}) coincide exactamente con el de ${previous.fullMonthName}.`
          }
        } else {
          if (prevAmount === 0 && amount > 0) {
            summaryExplanation = `Mes inicial de referencia. Tu ${isExpense ? 'gasto' : 'ingreso'} total fue de ${formatCurrency(amount)}.`
          } else if (absoluteChange > 0) {
            const causes = topIncreases
              .slice(0, 2)
              .map((c) => `${c.category} (+${formatCurrency(c.diff)})`)
              .join(' y ')
            const pctText = percentageChange !== null ? `un ${Math.abs(percentageChange).toFixed(1)}% ` : ''
            summaryExplanation = `En ${current.fullMonthName}, el ${isExpense ? 'gasto' : 'ingreso'} subió ${pctText}(+${formatCurrency(absoluteChange)}) respecto a ${previous.fullMonthName}.`
            if (comparablePrevTotal > 0 || comparableCurrentTotal > 0) {
              summaryExplanation += ` En partidas habituales la variación fue de ${comparableDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(comparableDiff))}${causes ? ` (mayor subida en ${causes})` : ''}.`
            }
            summaryExplanation += extrasSummarySentence
          } else if (absoluteChange < 0) {
            const relief = topDecreases
              .slice(0, 2)
              .map((c) => `${c.category} (-${formatCurrency(Math.abs(c.diff))})`)
              .join(' y ')
            const pctText = percentageChange !== null ? `un ${Math.abs(percentageChange).toFixed(1)}% ` : ''
            summaryExplanation = `En ${current.fullMonthName} ${isExpense ? 'gastaste' : 'ingresaste'} ${pctText}menos (-${formatCurrency(Math.abs(absoluteChange))}) que en ${previous.fullMonthName}.`
            if (comparablePrevTotal > 0 || comparableCurrentTotal > 0) {
              summaryExplanation += ` En partidas habituales la variación fue de ${comparableDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(comparableDiff))}${relief ? ` (mayor ahorro en ${relief})` : ''}.`
            }
            summaryExplanation += extrasSummarySentence
          } else {
            summaryExplanation = `Volumen de ${isExpense ? 'gastos' : 'ingresos'} idéntico al mes anterior (${formatCurrency(amount)}).`
          }
        }
      } else {
        if (isCurrentMonth) {
          const isUp = absoluteChange >= 0
          const pctPart = percentageChange !== null ? ` (${Math.abs(percentageChange)}%)` : ''
          summaryExplanation = `En ${selectedCategory}, contando ejecutado y futuros (${formatCurrency(amount)}), el ${isExpense ? 'gasto' : 'ingreso'} ${isUp ? 'sube' : 'baja'} ${formatCurrency(Math.abs(absoluteChange))}${pctPart} frente a ${previous.fullMonthName} (${formatCurrency(prevAmount)}).`
        } else {
          if (prevAmount === 0 && amount > 0) {
            summaryExplanation = `En ${selectedCategory} no hubo movimientos el mes anterior; este mes registraste ${formatCurrency(amount)} en ${current.txCount} movimiento(s).`
          } else if (prevAmount > 0 && amount === 0) {
            summaryExplanation = `En ${selectedCategory} no registraste movimientos este mes (mes anterior: ${formatCurrency(prevAmount)}).`
          } else {
            const isUp = absoluteChange >= 0
            const pctPart = percentageChange !== null ? ` (${Math.abs(percentageChange).toFixed(1)}%)` : ''
            summaryExplanation = `En ${selectedCategory}, el ${isExpense ? 'gasto' : 'ingreso'} ${isUp ? 'subió' : 'bajó'} ${formatCurrency(Math.abs(absoluteChange))}${pctPart}. Registraste ${current.txCount} movimiento(s) (ticket medio de ${formatCurrency(avgTicket)}) frente a ${previous.txCount} del mes previo (${formatCurrency(prevAvgTicket || 0)}).`
          }
        }
      }

      resultWithVariations.push({
        monthKey: current.monthKey,
        monthLabel: current.monthLabel,
        fullMonthName: current.fullMonthName,
        date: current.date,
        amount: Number(amount.toFixed(2)),
        realAmount: Number(realAmount.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        prevAmount: Number(prevAmount.toFixed(2)),
        prevRealAmount: Number(prevRealAmount.toFixed(2)),
        fullMonthPrevAmount: Number(prevAmount.toFixed(2)),
        fullMonthPercentageChange,
        fullMonthAbsoluteChange,
        percentageChange: percentageChange !== null ? Number(percentageChange.toFixed(1)) : null,
        absoluteChange: Number(absoluteChange.toFixed(2)),
        incomeAmount: current.incomeAmount,
        expenseAmount: current.expenseAmount,
        netAmount: current.netAmount,
        prevNetAmount: previous.netAmount,
        savingsRate,
        structuralNetAmount: current.structuralNetAmount,
        structuralSavingsRate: current.structuralSavingsRate,
        natureBreakdown: current.natureBreakdown,
        txCount: current.txCount,
        realTxCount: current.realTxCount,
        pendingTxCount: current.pendingTxCount,
        transactions: current.transactions,
        prevTransactions: previous.transactions,
        mtdCurrentTxs,
        mtdPrevTxs,
        isCurrentMonth,
        daysInMonth,
        currentDayOfMonth,
        mtdCurrentAmount: Number(mtdCurrentAmount.toFixed(2)),
        mtdPrevAmount: Number(mtdPrevAmount.toFixed(2)),
        mtdPercentageChange:
          mtdPercentageChange !== null ? Number(mtdPercentageChange.toFixed(1)) : null,
        mtdAbsoluteChange: Number(mtdAbsoluteChange.toFixed(2)),
        categoryDiffs,
        topIncreases,
        topDecreases,
        comparableCurrentTotal,
        comparablePrevTotal,
        comparableDiff,
        comparablePercentageDiff,
        extrasCurrentTotal,
        extrasPrevTotal,
        extrasDiff,
        extrasPercentageDiff,
        currentExtras,
        prevExtras,
        topTransactions,
        summaryExplanation,
        avgTicket: Number(avgTicket.toFixed(2)),
        prevAvgTicket: prevAvgTicket !== null ? Number(prevAvgTicket.toFixed(2)) : null,
      })
    }

    return resultWithVariations
  }, [
    validTransactions,
    selectedCategory,
    timeframe,
    isExpense,
    isBalance,
    resolveCanonicalCategory,
  ])

  // Ranking rápido de categorías en el periodo analizado (para filtrar con 1 click)
  const periodCategoryRanking = useMemo(() => {
    if (isBalance || evolutionData.length === 0) return []
    const totals: Record<string, { name: string; total: number }> = {}
    let grandTotal = 0

    evolutionData.forEach((m) => {
      m.transactions.forEach((t) => {
        const norm = normalizeCatKey(t.category)
        if (!totals[norm]) {
          totals[norm] = { name: resolveCanonicalCategory(t.category), total: 0 }
        }
        totals[norm].total += t.amount
        grandTotal += t.amount
      })
    })

    return Object.values(totals)
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        total: Number(item.total.toFixed(2)),
        share: grandTotal > 0 ? Number(((item.total / grandTotal) * 100).toFixed(1)) : 0,
      }))
  }, [evolutionData, isBalance, resolveCanonicalCategory])

  // Overall Statistics for active view (Promedio calculado sobre meses cerrados para evitar distorsión del mes en curso)
  const stats = useMemo(() => {
    if (evolutionData.length === 0) {
      return {
        latestMonth: null,
        latestAmount: 0,
        latestPercentChange: null,
        latestAbsoluteChange: 0,
        averageMonthly: 0,
        closedMonthsCount: 0,
        peakMonth: null,
        peakAmount: 0,
        totalPeriod: 0,
        totalIncomePeriod: 0,
        totalExpensePeriod: 0,
        totalTransactions: 0,
      }
    }

    const latest = evolutionData[evolutionData.length - 1]
    const totalPeriod = evolutionData.reduce((sum, item) => sum + item.amount, 0)
    const totalIncomePeriod = evolutionData.reduce((sum, item) => sum + (item.incomeAmount || 0), 0)
    const totalExpensePeriod = evolutionData.reduce((sum, item) => sum + (item.expenseAmount || 0), 0)

    // Usar meses cerrados con actividad para la media mensual (o todos si solo existe el mes actual)
    const closedMonths = evolutionData.filter((m) => !m.isCurrentMonth)
    const monthsForAverage = closedMonths.length > 0 ? closedMonths : evolutionData
    const averageMonthly =
      monthsForAverage.reduce((sum, item) => sum + item.amount, 0) / monthsForAverage.length

    const totalTransactions = evolutionData.reduce((sum, item) => sum + item.txCount, 0)

    let peakMonth = evolutionData[0]
    let peakAmount = evolutionData[0]?.amount ?? 0

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
      averageMonthly: Number(averageMonthly.toFixed(2)),
      closedMonthsCount: closedMonths.length,
      peakMonth,
      peakAmount,
      totalPeriod: Number(totalPeriod.toFixed(2)),
      totalIncomePeriod: Number(totalIncomePeriod.toFixed(2)),
      totalExpensePeriod: Number(totalExpensePeriod.toFixed(2)),
      totalTransactions,
    }
  }, [evolutionData])

  // Pulso de Hábitos (Últimos 3 meses vs. 3 meses anteriores) para modo Balance
  const habitPulse = useMemo(() => {
    if (!isBalance || baseValidTransactions.length === 0) return null

    const now = new Date()
    const currentMonthDate = startOfMonth(now)
    const months6 = eachMonthOfInterval({
      start: subMonths(currentMonthDate, 5),
      end: currentMonthDate,
    }).map((d) => ({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM', { locale: es }),
    }))

    const aggregateWindow = (monthKeys: string[]) => {
      let activeMonths = 0
      let totalIncome = 0
      let totalExpense = 0
      let totalDiscretionary = 0
      let totalDebt = 0
      let totalExtraordinary = 0

      for (const mk of monthKeys) {
        const mTxs = baseValidTransactions.filter((t) => t.date.startsWith(mk))
        if (mTxs.length === 0) continue
        activeMonths++
        for (const t of mTxs) {
          if (t.type === 'income') {
            totalIncome += t.amount
          } else {
            totalExpense += t.amount
            const nature = getCategoryNature(t.category, categories)
            if (nature === 'discretionary') totalDiscretionary += t.amount
            else if (nature === 'debt') totalDebt += t.amount
            else if (nature === 'extraordinary') totalExtraordinary += t.amount
          }
        }
      }

      const denom = activeMonths || 1
      const totalStructuralExpense = totalExpense - totalExtraordinary
      const totalStructuralNet = totalIncome - totalStructuralExpense
      const avgStructuralNet = Number((totalStructuralNet / denom).toFixed(2))
      const avgDiscretionary = Number((totalDiscretionary / denom).toFixed(2))
      const avgDebt = Number((totalDebt / denom).toFixed(2))
      const discretionaryPct =
        totalIncome > 0 ? Number(((totalDiscretionary / totalIncome) * 100).toFixed(1)) : 0
      const debtPct =
        totalIncome > 0 ? Number(((totalDebt / totalIncome) * 100).toFixed(1)) : 0
      const structuralSavingsRate =
        totalIncome > 0 ? Number(((totalStructuralNet / totalIncome) * 100).toFixed(1)) : 0

      return {
        activeMonths,
        avgStructuralNet,
        avgDiscretionary,
        avgDebt,
        discretionaryPct,
        debtPct,
        structuralSavingsRate,
      }
    }

    const prevKeys = months6.slice(0, 3).map((m) => m.key)
    const recentKeys = months6.slice(3, 6).map((m) => m.key)
    const prev = aggregateWindow(prevKeys)
    const recent = aggregateWindow(recentKeys)

    if (recent.activeMonths === 0 || prev.activeMonths === 0) return null

    // Comprobar si hubo nueva financiación/préstamo en los últimos 3 meses
    const recentKeySet = new Set(recentKeys)
    const hasNewDebtRecent = transactions.some(
      (t) =>
        !t.isPending &&
        !t.isIgnored &&
        t.type === 'income' &&
        recentKeySet.has(t.date.slice(0, 7)) &&
        isFinancingCategory(t.category, categories) &&
        (selectedAccountId === 'all' || t.accountId === selectedAccountId)
    )

    const netDelta = Number((recent.avgStructuralNet - prev.avgStructuralNet).toFixed(2))
    const discPctDelta = Number((recent.discretionaryPct - prev.discretionaryPct).toFixed(1))

    let status: 'improving' | 'stable' | 'attention' = 'stable'
    let title = 'En transición / Estable'
    let explanation = ''

    if (recent.avgStructuralNet > 0 && netDelta >= 50 && !hasNewDebtRecent) {
      status = 'improving'
      title = 'Vas por buen camino (En mejora)'
      explanation = `Tu ahorro estructural medio subió +${formatCurrency(netDelta)}/mes frente al trimestre anterior${
        discPctDelta < 0
          ? ` y redujiste tu gasto en estilo de vida en ${Math.abs(discPctDelta)} puntos sobre tus ingresos.`
          : ' sin recurrir a nueva deuda.'
      }`
    } else if (
      recent.avgStructuralNet < 0 ||
      hasNewDebtRecent ||
      (netDelta <= -100 && discPctDelta > 2)
    ) {
      status = 'attention'
      title = 'Atención: margen ajustado'
      explanation = hasNewDebtRecent
        ? 'Se registró nueva financiación en los últimos 3 meses. Conviene vigilar el bloque de Estilo de vida para volver a ahorrar sin crédito.'
        : recent.avgStructuralNet < 0
          ? `En los últimos 3 meses tu balance estructural medio es negativo (${formatCurrency(recent.avgStructuralNet)}/mes). Revisa el bloque de Estilo de vida (${recent.discretionaryPct}% de tus ingresos).`
          : `Tu ahorro estructural bajó ${formatCurrency(Math.abs(netDelta))}/mes mientras subió el peso del Estilo de vida (+${discPctDelta} pts).`
    } else {
      status = 'stable'
      title = recent.avgStructuralNet >= 0 ? 'Economía estable y positiva' : 'En transición'
      explanation = `Mantienes un ahorro estructural medio de ${recent.avgStructuralNet >= 0 ? '+' : ''}${formatCurrency(recent.avgStructuralNet)}/mes (${recent.structuralSavingsRate}% de tus ingresos) con un ${recent.discretionaryPct}% en Estilo de vida.`
    }

    return {
      status,
      title,
      explanation,
      prevLabel: `${months6[0].label}–${months6[2].label}`,
      recentLabel: `${months6[3].label}–${months6[5].label}`,
      prev,
      recent,
      netDelta,
      discPctDelta,
      hasNewDebtRecent,
    }
  }, [isBalance, baseValidTransactions, transactions, categories, selectedAccountId])

  // Helper for category icon
  const renderCategoryIcon = (catName: string, sizeClass = 'w-5 h-5') => {
    if (catName === 'all') {
      return <Layers className={sizeClass} />
    }
    const cat = categories.find((c: any) => {
      const name = typeof c === 'string' ? c : c.name
      return normalizeCatKey(name) === normalizeCatKey(catName)
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
    // Si no hay porcentaje válido (p.ej. de 0 € a X € o de X € a 0 €), mostrar solo el importe
    if (percent === null) {
      if (absDiff !== undefined && absDiff !== null && Math.abs(absDiff) > 0.005) {
        const isIncrease = absDiff > 0
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
              {formatCurrency(absDiff)}
            </span>
          </span>
        )
      }

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
    // For Incomes & Balance: increase is favorable (green), decrease is unfavorable (red)
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
      if (isBalance) {
        return (
          <div className="bg-popover/95 backdrop-blur-md border border-border/60 shadow-xl rounded-xl p-3 text-xs space-y-1.5 min-w-[200px] pointer-events-none">
            <div className="font-bold text-foreground capitalize flex items-center justify-between border-b border-border/40 pb-1">
              <span>{data.fullMonthName}</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Tasa: {data.savingsRate ?? 0}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-0.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ingresos:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.incomeAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">Gastos:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(data.expenseAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-1">
              <span className="text-muted-foreground font-semibold">
                {data.isCurrentMonth ? 'Balance Previsto:' : 'Balance Neto:'}
              </span>
              <span
                className={cn(
                  'font-black text-sm',
                  (data.netAmount || 0) >= 0
                    ? 'text-primary'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {(data.netAmount || 0) > 0 ? '+' : ''}
                {formatCurrency(data.netAmount || 0)}
              </span>
            </div>
          </div>
        )
      }

      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 shadow-xl rounded-xl p-3 text-xs space-y-1.5 min-w-[190px] pointer-events-none">
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
          {data.pendingAmount > 0 && (
            <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-1 flex flex-col gap-0.5">
              <div className="flex justify-between">
                <span>Ejecutado real:</span>
                <span className="font-semibold text-foreground">{formatCurrency(data.realAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Previsto pendiente:</span>
                <span className="font-semibold">+{formatCurrency(data.pendingAmount)}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              {data.isCurrentMonth ? 'Previsto vs mes ant.:' : 'Variación mensual:'}
            </span>
            <div>{renderVariationBadge(data.percentageChange, data.absoluteChange, true)}</div>
          </div>
          {data.isCurrentMonth && data.mtdPercentageChange !== undefined && data.mtdPercentageChange !== null && (
            <div className="flex items-center justify-between gap-4 border-t border-border/30 pt-1">
              <span className="text-muted-foreground">A día {data.currentDayOfMonth}:</span>
              <div>
                {renderVariationBadge(
                  data.mtdPercentageChange ?? null,
                  data.mtdAbsoluteChange ?? null,
                  true
                )}
              </div>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const formatYAxisTick = (val: number) => {
    const abs = Math.abs(val)
    const sign = val < 0 ? '-' : ''
    if (abs >= 1000) {
      return `${sign}${(abs / 1000).toFixed(1)}k €`
    }
    return `${val} €`
  }

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
            {isBalance
              ? 'Evolución de Balance y Ahorro'
              : `Evolución de ${isExpense ? 'Gastos' : 'Ingresos'}`}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isBalance
              ? 'Comparativa mensual de Ingresos vs Gastos, ahorro neto y tasa de ahorro.'
              : 'Analiza el comportamiento y la variación real mes a mes por categoría.'}
          </p>
        </div>

        {/* Controls: Type switcher + Timeframe */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Gastos vs Ingresos vs Balance Pill Switcher */}
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
                isIncome
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Ingresos</span>
            </button>
            <button
              onClick={() => setMovementType('balance')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all',
                isBalance
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Balance</span>
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

      {/* Filter Bar: Category, Account & Quick 1-Tap Category Chips */}
      <Card className="border border-border/40 shadow-sm bg-card/60 backdrop-blur-sm rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
            {/* Cascading Group -> Subcategory selectors (hidden in Balance mode) */}
            {!isBalance && availableGroups.length > 0 ? (
              <>
                {/* Select 1: Grupo */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Grupo
                  </label>
                  <Select
                    value={selectedGroupId}
                    onValueChange={(val) => {
                      setSelectedGroupId(val)
                      if (val === 'all') {
                        setSelectedCategory('all')
                      } else {
                        const grp = availableGroups.find((g) => g.id === val)
                        if (grp) setSelectedCategory(grp.name)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl bg-background border-border/60 text-sm font-semibold">
                      <div className="flex items-center gap-2 truncate">
                        {(() => {
                          const activeGrp = availableGroups.find((g) => g.id === selectedGroupId)
                          return (
                            <>
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ backgroundColor: activeGrp?.color || '#64748b' }}
                              >
                                {activeGrp ? (
                                  renderCategoryIcon(activeGrp.name, 'w-3.5 h-3.5')
                                ) : (
                                  <Layers className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <span className="truncate">
                                {activeGrp ? activeGrp.name : 'Todos los grupos'}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all" className="font-bold py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-500 text-white flex items-center justify-center">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <span>Todos los grupos</span>
                        </div>
                      </SelectItem>
                      {availableGroups.map((grp) => (
                        <SelectItem key={grp.id} value={grp.id} className="py-2 font-medium">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                              style={{ backgroundColor: grp.color || defaultTypeColor }}
                            >
                              {renderCategoryIcon(grp.name, 'w-3 h-3')}
                            </div>
                            <span>{grp.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Select 2: Subcategoría */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Subcategoría
                  </label>
                  {(() => {
                    const activeGrp = availableGroups.find((g) => g.id === selectedGroupId)
                    const isWholeGroupSelected =
                      Boolean(activeGrp) &&
                      normalizeCatKey(selectedCategory) === normalizeCatKey(activeGrp!.name)
                    const subSelectValue =
                      selectedGroupId !== 'all' && isWholeGroupSelected
                        ? '__group_all__'
                        : selectedCategory

                    return (
                      <Select
                        value={subSelectValue}
                        onValueChange={(val) => {
                          if (val === '__group_all__' && activeGrp) {
                            setSelectedCategory(activeGrp.name)
                          } else {
                            setSelectedCategory(val)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full h-11 rounded-xl bg-background border-border/60 text-sm font-semibold">
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                              style={{
                                backgroundColor:
                                  selectedCategory === 'all' ? '#64748b' : activeColor,
                              }}
                            >
                              {renderCategoryIcon(selectedCategory, 'w-3.5 h-3.5')}
                            </div>
                            <span className="capitalize truncate">
                              {selectedCategory === 'all'
                                ? `Todas (${isExpense ? 'Gasto Total' : 'Ingreso Total'})`
                                : isWholeGroupSelected && activeGrp
                                  ? `Todo ${activeGrp.name}`
                                  : selectedCategory}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {selectedGroupId === 'all' ? (
                            <SelectItem value="all" className="font-bold py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-slate-500 text-white flex items-center justify-center">
                                  <Layers className="w-3.5 h-3.5" />
                                </div>
                                <span>
                                  Todas ({isExpense ? 'Gasto Total' : 'Ingreso Total'})
                                </span>
                              </div>
                            </SelectItem>
                          ) : (
                            activeGrp && (
                              <SelectItem value="__group_all__" className="font-bold py-2.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-6 h-6 rounded-lg text-white flex items-center justify-center"
                                    style={{ backgroundColor: activeGrp.color || defaultTypeColor }}
                                  >
                                    {renderCategoryIcon(activeGrp.name, 'w-3.5 h-3.5')}
                                  </div>
                                  <span>Todo el grupo ({activeGrp.name})</span>
                                </div>
                              </SelectItem>
                            )
                          )}
                          {filteredSubcategories.map((catName) => {
                            const catObj = categories.find(
                              (c: any) =>
                                normalizeCatKey(typeof c === 'string' ? c : c.name) ===
                                normalizeCatKey(catName)
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
                    )
                  })()}
                </div>
              </>
            ) : (
              !isBalance && (
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
                          (c: any) =>
                            normalizeCatKey(typeof c === 'string' ? c : c.name) ===
                            normalizeCatKey(catName)
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
              )
            )}

            {/* Account filter */}
            <div className={cn('space-y-1.5', isBalance ? 'lg:col-span-12' : 'lg:col-span-4')}>
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

          {/* Chips rápidos de Top Categorías del periodo (1-Tap Filter) */}
          {!isBalance && periodCategoryRanking.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Filtro rápido: principales categorías del periodo</span>
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="text-primary hover:underline font-bold normal-case"
                  >
                    Ver todas las categorías
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all',
                    selectedCategory === 'all'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background/80 text-muted-foreground border-border/50 hover:text-foreground'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Todas</span>
                </button>
                {periodCategoryRanking.map((item) => {
                  const isActive =
                    normalizeCatKey(selectedCategory) === normalizeCatKey(item.name)
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(isActive ? 'all' : item.name)
                      }
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all capitalize',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background/80 text-foreground/90 border-border/50 hover:border-primary/40'
                      )}
                    >
                      {renderCategoryIcon(item.name, 'w-3.5 h-3.5')}
                      <span>{item.name}</span>
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.2 rounded-md',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {item.share}%
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pulso de Hábitos (Últimos 3 meses vs. 3 anteriores) — Solo modo Balance */}
      {isBalance && habitPulse && (
        <Card
          className={cn(
            'rounded-2xl border shadow-xs overflow-hidden',
            habitPulse.status === 'improving'
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : habitPulse.status === 'attention'
                ? 'bg-rose-500/5 border-rose-500/30'
                : 'bg-blue-500/5 border-blue-500/30'
          )}
        >
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={cn(
                      'text-[11px] font-extrabold uppercase tracking-wider',
                      habitPulse.status === 'improving'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                        : habitPulse.status === 'attention'
                          ? 'bg-rose-600 text-white hover:bg-rose-600'
                          : 'bg-blue-600 text-white hover:bg-blue-600'
                    )}
                  >
                    Pulso de Hábitos
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground capitalize">
                    {habitPulse.prevLabel} vs. {habitPulse.recentLabel}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {habitPulse.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {habitPulse.explanation}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Ahorro estructural medio */}
              <div className="p-3 rounded-xl bg-background/80 border border-border/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Ahorro estructural / mes
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'text-lg font-black',
                      habitPulse.recent.avgStructuralNet >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {habitPulse.recent.avgStructuralNet > 0 ? '+' : ''}
                    {formatCurrency(habitPulse.recent.avgStructuralNet)}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    ({habitPulse.recent.structuralSavingsRate}%)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Antes: {habitPulse.prev.avgStructuralNet > 0 ? '+' : ''}
                  {formatCurrency(habitPulse.prev.avgStructuralNet)}/mes
                </p>
              </div>

              {/* 2. Estilo de vida (Hábitos) */}
              <div className="p-3 rounded-xl bg-background/80 border border-border/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Hábitos (Estilo de vida / mes)
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {formatCurrency(habitPulse.recent.avgDiscretionary)}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-bold',
                      habitPulse.discPctDelta <= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {habitPulse.recent.discretionaryPct}% ing.
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Antes: {formatCurrency(habitPulse.prev.avgDiscretionary)}/mes ({habitPulse.prev.discretionaryPct}%)
                </p>
              </div>

              {/* 3. Carga de Deuda */}
              <div className="p-3 rounded-xl bg-background/80 border border-border/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Carga de Deuda / mes
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(habitPulse.recent.avgDebt)}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {habitPulse.recent.debtPct}% ing.
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {habitPulse.hasNewDebtRecent
                    ? 'Con nueva financiación reciente'
                    : 'Sin nueva deuda en los últimos 3m'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Último Mes & Variación vs anterior */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isBalance
                  ? `Balance Mes (${stats.latestMonth?.monthLabel || 'N/A'})`
                  : `Último Mes (${stats.latestMonth?.monthLabel || 'N/A'})`}
              </span>
              <div
                className={cn(
                  'p-2 rounded-xl',
                  isBalance
                    ? 'bg-primary/10 text-primary'
                    : isExpense
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div
              className={cn(
                'text-2xl sm:text-3xl font-black tracking-tight',
                isBalance
                  ? stats.latestAmount >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  : 'text-foreground'
              )}
            >
              {isBalance && stats.latestAmount > 0 ? '+' : ''}
              {formatCurrency(stats.latestAmount)}
            </div>

            {isBalance && stats.latestMonth ? (
              <div className="text-[11px] text-muted-foreground font-medium pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                  Ing: {formatCurrency(stats.latestMonth.incomeAmount || 0)}
                </span>
                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
                  Gas: {formatCurrency(stats.latestMonth.expenseAmount || 0)}
                </span>
              </div>
            ) : (
              stats.latestMonth?.isCurrentMonth && (
                <div className="text-xs text-muted-foreground font-medium pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="bg-muted/70 px-2 py-0.5 rounded-md text-foreground font-semibold">
                    Ejecutado: {formatCurrency(stats.latestMonth.realAmount)}
                  </span>
                  {stats.latestMonth.pendingAmount > 0 && (
                    <>
                      <span className="font-bold text-muted-foreground">+</span>
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-semibold">
                        Prev: {formatCurrency(stats.latestMonth.pendingAmount)}
                      </span>
                    </>
                  )}
                </div>
              )
            )}

            <div className="pt-1 flex items-center gap-2 flex-wrap">
              {renderVariationBadge(stats.latestPercentChange, stats.latestAbsoluteChange)}
              <span className="text-[11px] text-muted-foreground">
                {stats.latestMonth?.isCurrentMonth && !isBalance
                  ? 'previsto vs mes ant.'
                  : 'vs mes previo'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Promedio Mensual (Meses Cerrados) */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isBalance ? 'Balance Medio Mensual' : 'Promedio Mensual'}
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isBalance && stats.averageMonthly > 0 ? '+' : ''}
              {formatCurrency(stats.averageMonthly)}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
              <span>
                {stats.closedMonthsCount > 0
                  ? `Media de ${stats.closedMonthsCount} ${stats.closedMonthsCount === 1 ? 'mes cerrado' : 'meses cerrados'}`
                  : `Periodo de ${evolutionData.length} mes(es)`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Mes Pico (Máximo) */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isBalance ? 'Mejor Balance Mensual' : 'Pico Más Alto'}
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
              {isBalance && stats.peakAmount > 0 ? '+' : ''}
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
                {isBalance ? 'Balance Acumulado' : 'Total Acumulado'}
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div
              className={cn(
                'text-2xl sm:text-3xl font-black tracking-tight',
                isBalance
                  ? stats.totalPeriod >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  : 'text-foreground'
              )}
            >
              {isBalance && stats.totalPeriod > 0 ? '+' : ''}
              {formatCurrency(stats.totalPeriod)}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1 truncate">
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              {isBalance ? (
                <span className="truncate">
                  Ing: {formatCurrency(stats.totalIncomePeriod)} • Gas:{' '}
                  {formatCurrency(stats.totalExpensePeriod)}
                </span>
              ) : (
                <span>
                  {stats.totalTransactions}{' '}
                  {isExpense ? 'gastos registrados' : 'ingresos registrados'}
                </span>
              )}
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
                className={cn(
                  'w-4 h-4',
                  isBalance ? 'text-primary' : isExpense ? 'text-rose-500' : 'text-emerald-500'
                )}
              />
              {isBalance
                ? 'Evolución de Ingresos vs Gastos'
                : `Evolución Temporal de ${isExpense ? 'Gastos' : 'Ingresos'}`}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isBalance
                ? 'Comparativa mensual de entradas (verde) y salidas (rojo)'
                : 'Curva mes a mes con línea de referencia sobre meses cerrados'}
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
                {isBalance ? (
                  chartMode === 'area' ? (
                    <AreaChart
                      data={evolutionData}
                      margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
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
                        tickFormatter={formatYAxisTick}
                        className="text-muted-foreground"
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="incomeAmount"
                        name="Ingresos"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#incomeGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenseAmount"
                        name="Gastos"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#expenseGrad)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={evolutionData}
                      margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
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
                        tickFormatter={formatYAxisTick}
                        className="text-muted-foreground"
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar
                        dataKey="incomeAmount"
                        name="Ingresos"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="expenseAmount"
                        name="Gastos"
                        fill="#f43f5e"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  )
                ) : chartMode === 'area' ? (
                  <AreaChart
                    data={evolutionData}
                    margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
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
                      tickFormatter={formatYAxisTick}
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
                    margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
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
                      tickFormatter={formatYAxisTick}
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
                Toca cualquier mes para ver el diagnóstico detallado y sus movimientos.
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
              const maxAbsPeak = Math.max(
                ...evolutionData.map((m) => Math.abs(m.amount)),
                1
              )
              const peakPct = (Math.abs(item.amount) / maxAbsPeak) * 100

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base capitalize text-foreground">
                          {item.fullMonthName}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                          {item.txCount}{' '}
                          {item.txCount === 1 ? 'movimiento' : 'movimientos'}
                        </span>
                        {isBalance && item.savingsRate !== undefined && item.savingsRate !== null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold',
                              item.savingsRate >= 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            )}
                          >
                            Ahorro: {item.savingsRate}%
                          </Badge>
                        )}
                      </div>

                      {/* Visual volume relative bar */}
                      <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(peakPct, 2)}%`,
                            backgroundColor: isBalance
                              ? item.amount >= 0
                                ? '#10b981'
                                : '#f43f5e'
                              : activeColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Amount & Variation Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={cn(
                            'font-black text-sm sm:text-base tracking-tight',
                            isBalance
                              ? item.amount >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                              : 'text-foreground'
                          )}
                        >
                          {isBalance && item.amount > 0 ? '+' : ''}
                          {formatCurrency(item.amount)}
                        </div>
                        {isBalance ? (
                          <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              +{formatCurrency(item.incomeAmount || 0)}
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              -{formatCurrency(item.expenseAmount || 0)}
                            </span>
                          </div>
                        ) : item.isCurrentMonth ? (
                          <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 flex-wrap">
                            <span>
                              Ejec:{' '}
                              <strong className="text-foreground font-semibold">
                                {formatCurrency(item.realAmount)}
                              </strong>
                            </span>
                            {item.pendingAmount > 0 && (
                              <>
                                <span>+</span>
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  Prev: {formatCurrency(item.pendingAmount)}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">
                            {item.prevAmount !== null && (
                              <span>prev: {formatCurrency(item.prevAmount)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="min-w-[90px] flex flex-col items-end justify-center">
                        {renderVariationBadge(item.percentageChange, item.absoluteChange)}
                        {item.isCurrentMonth && !isBalance && (
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            previsto vs mes ant.
                          </span>
                        )}
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

                  {/* Expanded Content with Tabs: Diagnosis vs Transactions */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Sub-tabs header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setMonthTab(item.monthKey, 'diagnosis')}
                            className={cn(
                              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                              getMonthTab(item.monthKey) === 'diagnosis'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>Diagnóstico & Por qué</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonthTab(item.monthKey, 'transactions')}
                            className={cn(
                              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                              getMonthTab(item.monthKey) === 'transactions'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Movimientos ({item.txCount})</span>
                          </button>
                        </div>

                        <div className="text-[11px] text-muted-foreground hidden sm:block">
                          {item.fullMonthName}
                        </div>
                      </div>

                      {/* Tab 1: Diagnóstico interactivo */}
                      {getMonthTab(item.monthKey) === 'diagnosis' ? (
                        <EvolutionMonthDiagnosis
                          data={item}
                          movementType={movementType}
                          selectedCategory={selectedCategory}
                          categories={categories}
                          accounts={accounts}
                          renderCategoryIcon={renderCategoryIcon}
                          renderVariationBadge={renderVariationBadge}
                          onViewTransactions={() => setMonthTab(item.monthKey, 'transactions')}
                        />
                      ) : (
                        /* Tab 2: Lista detallada de transacciones */
                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                            <span>
                              {isBalance
                                ? 'Movimientos'
                                : isExpense
                                  ? 'Gastos'
                                  : 'Ingresos'}{' '}
                              registrados en {item.fullMonthName}:
                            </span>
                            <span className="text-[11px] font-normal lowercase">
                              {item.transactions.length} movimientos
                            </span>
                          </div>
                          {item.transactions.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2 px-1 italic">
                              No hay movimientos registrados en este mes.
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                              {item.transactions.map((tx) => {
                                const account = accounts.find((a) => a.id === tx.accountId)
                                return (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-background/80 border border-border/30 text-xs hover:border-border/60 transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                                        {renderCategoryIcon(tx.category, 'w-3.5 h-3.5')}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-semibold text-foreground truncate">
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
                                        tx.type === 'expense'
                                          ? 'text-foreground'
                                          : 'text-emerald-600 dark:text-emerald-400'
                                      )}
                                    >
                                      {tx.type === 'expense' ? '-' : '+'}
                                      {formatCurrency(tx.amount)}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
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
