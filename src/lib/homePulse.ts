import {
  format,
  parseISO,
  getDate,
  getDaysInMonth,
  subMonths,
  addMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Account,
  Budget,
  Category,
  RecurringExpenseRule,
  SavingsGoal,
  Transaction,
} from '@/types/finance'
import {
  calculatePendingImpact,
  calculateTotalBalance,
  isTransfer,
} from '@/lib/calculations'
import { calculateSavingsProvisions } from '@/lib/savingsCalculations'

export interface DiagnosisCategoryDiff {
  category: string
  currentAmount: number
  prevAmount: number
  diff: number
  percentageDiff: number | null
}

export interface HomeDiagnosisResult {
  currentDayOfMonth: number
  daysInCurrentMonth: number
  daysLeft: number
  currentMonthName: string
  prevMonthName: string
  realAmount: number
  realTxCount: number
  pendingAmount: number
  pendingTxCount: number
  expectedTotal: number
  prevMonthTotal: number
  fullMonthDiff: number
  fullMonthPercent: number | null
  realIncomeAmount: number
  pendingIncomeAmount: number
  curMonthIncome: number
  expectedNetBalance: number
  mtdCurAmount: number
  mtdPrevAmount: number
  mtdDiff: number
  mtdPercent: number | null
  topIncreases: DiagnosisCategoryDiff[]
  topDecreases: DiagnosisCategoryDiff[]
  comparableCurrentTotal: number
  comparablePrevTotal: number
  comparableDiff: number
  comparablePercentageDiff: number | null
  extrasCurrentTotal: number
  extrasPrevTotal: number
  extrasDiff: number
  extrasPercentageDiff: number | null
  currentExtras: DiagnosisCategoryDiff[]
  prevExtras: DiagnosisCategoryDiff[]
}

export interface BudgetEnvelopeStatus {
  category: string
  budgetAmount: number
  realSpent: number
  pendingSpent: number
  remaining: number
  percent: number
  isOverbudget: boolean
  isExact100: boolean
  isDanger: boolean
  hasMoneyLeft: boolean
}

export interface HomeBudgetAnalysisResult {
  currentDayOfMonth: number
  daysInMonth: number
  currentMonthKey: string
  currentMonthName: string
  nextMonthName: string
  nextMonthBudgetsTotal: number
  envelopes: BudgetEnvelopeStatus[]
  visibleEnvelopes: BudgetEnvelopeStatus[]
  hasBudgets: boolean
  totalBudget: number
  disponibleParaAsignar: number
  hasDeficit: boolean
  hasOverbudget: boolean
  overbudgetEnvelopes: BudgetEnvelopeStatus[]
}

/**
 * Computes current-month expense/income pace and category differences vs previous month.
 */
export function computeHomeDiagnosis(
  transactions: Transaction[],
  categories: Category[],
  now: Date = new Date()
): HomeDiagnosisResult {
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
    if (found) return typeof found === 'string' ? (found as any).trim() : (found as any).name.trim()
    return trimmed
  }

  const validTxs = transactions.filter((t) => {
    if (isTransfer(t.category)) return false
    if (t.amount <= 0) return false
    if (t.isPending && t.isIgnored) return false
    return true
  })

  const expenseTxs = validTxs.filter((t) => t.type === 'expense')
  const incomeTxs = validTxs.filter((t) => t.type === 'income')

  const curMonthTxs = expenseTxs.filter((t) => t.date.startsWith(currentMonthKey))
  const prevMonthTxs = expenseTxs.filter(
    (t) => t.date.startsWith(prevMonthKey) && !t.isPending
  )

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

  const curRealTxs = curMonthTxs.filter((t) => !t.isPending)
  const curPendingTxs = curMonthTxs.filter((t) => t.isPending)

  const realAmount = Number(curRealTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
  const pendingAmount = Number(curPendingTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
  const expectedTotal = Number((realAmount + pendingAmount).toFixed(2))
  const prevMonthTotal = Number(prevMonthTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))

  const fullMonthDiff = Number((expectedTotal - prevMonthTotal).toFixed(2))
  let fullMonthPercent: number | null = null
  if (prevMonthTotal > 0 && expectedTotal > 0) {
    fullMonthPercent = Number((((expectedTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(1))
  } else if (prevMonthTotal === 0 && expectedTotal === 0) {
    fullMonthPercent = 0
  }

  const expectedNetBalance = Number((curMonthIncome - expectedTotal).toFixed(2))

  const mtdPrevTxs = prevMonthTxs.filter((t) => getDate(parseISO(t.date)) <= targetPrevDay)
  const mtdCurAmount = realAmount
  const mtdPrevAmount = Number(mtdPrevTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
  const mtdDiff = Number((mtdCurAmount - mtdPrevAmount).toFixed(2))
  let mtdPercent: number | null = null
  if (mtdPrevAmount > 0 && mtdCurAmount > 0) {
    mtdPercent = Number((((mtdCurAmount - mtdPrevAmount) / mtdPrevAmount) * 100).toFixed(1))
  } else if (mtdPrevAmount === 0 && mtdCurAmount === 0) {
    mtdPercent = 0
  }

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

  const catDiffs: DiagnosisCategoryDiff[] = allCatNorms.map((norm) => {
    const cur = Number((curCatTotals[norm] || 0).toFixed(2))
    const prev = Number((prevCatTotals[norm] || 0).toFixed(2))
    const diff = Number((cur - prev).toFixed(2))
    let percentageDiff: number | null = null
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

  const comparableCategories = catDiffs.filter((d) => d.prevAmount > 0 && d.currentAmount > 0)
  const currentExtras = catDiffs
    .filter((d) => d.prevAmount === 0 && d.currentAmount > 0)
    .sort((a, b) => b.currentAmount - a.currentAmount)
  const prevExtras = catDiffs
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
      : null

  const extrasCurrentTotal = Number(
    currentExtras.reduce((s, d) => s + d.currentAmount, 0).toFixed(2)
  )
  const extrasPrevTotal = Number(prevExtras.reduce((s, d) => s + d.prevAmount, 0).toFixed(2))
  const extrasDiff = Number((extrasCurrentTotal - extrasPrevTotal).toFixed(2))
  const extrasPercentageDiff =
    extrasPrevTotal > 0 && extrasCurrentTotal > 0
      ? Number((((extrasCurrentTotal - extrasPrevTotal) / extrasPrevTotal) * 100).toFixed(1))
      : null

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
  }
}

/**
 * Computes current-month budget envelopes, unallocated margin, and next-month provision.
 */
export function computeHomeBudgetAnalysis(params: {
  transactions: Transaction[]
  budgets: Budget[]
  accounts: Account[]
  goals: SavingsGoal[]
  recurringRules: RecurringExpenseRule[]
  savingsTimeframe: string
  excludedNextMonthIds: string[]
  now?: Date
}): HomeBudgetAnalysisResult {
  const {
    transactions,
    budgets,
    accounts,
    goals,
    recurringRules,
    savingsTimeframe,
    excludedNextMonthIds,
    now = new Date(),
  } = params

  const currentDayOfMonth = getDate(now)
  const daysInMonth = getDaysInMonth(now)
  const currentMonthKey = format(now, 'yyyy-MM')
  const currentMonthName = format(now, 'MMMM', { locale: es })

  const nextMonthDate = addMonths(now, 1)
  const nextMonthKey = format(nextMonthDate, 'yyyy-MM')
  const nextMonthName = format(nextMonthDate, 'MMMM', { locale: es })

  const excludedSet = new Set(excludedNextMonthIds)
  const nextMonthExpenses = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.date.startsWith(nextMonthKey) &&
      !isTransfer(t.category) &&
      t.amount > 0 &&
      !excludedSet.has(t.id)
  )
  const nextMonthBudgetsTotal = Number(
    nextMonthExpenses.reduce((acc, t) => acc + t.amount, 0).toFixed(2)
  )

  const budgetMap = new Map<string, Budget>()
  budgets.forEach((b) => {
    if (b.month === currentMonthKey && !isTransfer(b.category) && b.amount > 0) {
      const normKey = b.category.trim().toLowerCase()
      const existing = budgetMap.get(normKey)
      if (!existing || (existing.isAuto && !b.isAuto)) {
        budgetMap.set(normKey, b)
      }
    }
  })
  const activeBudgets = Array.from(budgetMap.values())

  const curMonthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false
    if (isTransfer(t.category)) return false
    if (!t.date.startsWith(currentMonthKey)) return false
    if (t.isPending && t.isIgnored) return false
    return true
  })

  const catRealTotals: Record<string, number> = {}
  const catPendingTotals: Record<string, number> = {}
  const catDisplayNames: Record<string, string> = {}

  curMonthExpenses.forEach((t) => {
    const normKey = t.category.trim().toLowerCase()
    if (!catDisplayNames[normKey]) {
      catDisplayNames[normKey] = t.category.trim()
    }
    if (t.isPending) {
      catPendingTotals[normKey] = (catPendingTotals[normKey] || 0) + t.amount
    } else {
      catRealTotals[normKey] = (catRealTotals[normKey] || 0) + t.amount
    }
  })

  const allEnvelopeEntries: { category: string; amount: number }[] = activeBudgets.map((b) => ({
    category: b.category,
    amount: b.amount,
  }))

  if (activeBudgets.length > 0) {
    Object.keys(catDisplayNames).forEach((normKey) => {
      if (!budgetMap.has(normKey)) {
        const totalSpent = Number(
          ((catRealTotals[normKey] || 0) + (catPendingTotals[normKey] || 0)).toFixed(2)
        )
        if (totalSpent > 0) {
          allEnvelopeEntries.push({
            category: catDisplayNames[normKey],
            amount: 0,
          })
        }
      }
    })
  }

  const envelopes: BudgetEnvelopeStatus[] = allEnvelopeEntries.map((b) => {
    const normKey = b.category.trim().toLowerCase()
    const realSpent = Number((catRealTotals[normKey] || 0).toFixed(2))
    const pendingSpent = Number((catPendingTotals[normKey] || 0).toFixed(2))
    const totalSpent = Number((realSpent + pendingSpent).toFixed(2))
    const budgetAmount = b.amount

    const effectiveSpent = budgetAmount > 0 ? realSpent : totalSpent
    const remaining = Number((budgetAmount - effectiveSpent).toFixed(2))
    const percent =
      budgetAmount > 0
        ? Number(((effectiveSpent / budgetAmount) * 100).toFixed(1))
        : effectiveSpent > 0
          ? 100
          : 0

    const isOverbudget = remaining < -0.005
    const isExact100 = !isOverbudget && remaining <= 0.005
    const hasMoneyLeft = remaining > 0.005
    const isDanger = isOverbudget || (hasMoneyLeft && percent >= 80)

    return {
      category: b.category,
      budgetAmount,
      realSpent: effectiveSpent,
      pendingSpent,
      remaining,
      percent,
      isOverbudget,
      isExact100,
      isDanger,
      hasMoneyLeft,
    }
  })

  const totalBudget = Number(activeBudgets.reduce((sum, b) => sum + b.amount, 0).toFixed(2))

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
    const baseGastos = Number(curMonthExpenses.reduce((sum, t) => sum + t.amount, 0).toFixed(2))
    const baseBudgets = Number(activeBudgets.reduce((sum, b) => sum + b.amount, 0).toFixed(2))
    const savingsProvisionsAmount =
      savingsTimeframe === 'none'
        ? 0
        : calculateSavingsProvisions(
            accounts,
            transactions,
            goals || [],
            recurringRules || [],
            savingsTimeframe
          ).totalSuggestedMonthly

    disponibleParaAsignar = Number(
      (
        baseCapital +
        baseGastos -
        baseBudgets -
        nextMonthBudgetsTotal -
        savingsProvisionsAmount
      ).toFixed(2)
    )
  }

  const hasDeficit = disponibleParaAsignar < 0
  const hasOverbudget = envelopes.some((e) => e.isOverbudget)
  const overbudgetEnvelopes = envelopes.filter((e) => e.isOverbudget)

  const visibleEnvelopes = envelopes
    .filter((e) => !e.isExact100 && (e.isDanger || e.hasMoneyLeft))
    .sort((a, b) => {
      if (a.isOverbudget && !b.isOverbudget) return -1
      if (!a.isOverbudget && b.isOverbudget) return 1
      if (a.isDanger && !b.isDanger) return -1
      if (!a.isDanger && b.isDanger) return 1
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
}
