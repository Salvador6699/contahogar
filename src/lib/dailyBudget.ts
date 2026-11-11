import { addMonths, format, getDate, getDaysInMonth } from 'date-fns'
import {
  Account,
  Budget,
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

export interface DailyBudgetResult {
  daysLeftInclusive: number
  currentDay: number
  daysInMonth: number
  projectedMonthEndCapital: number
  nextMonthProvision: number
  savingsProvision: number
  unallocatedMargin: number
  envelopesRemaining: number
  spendableMonthMargin: number
  dailyAllowance: number
  envelopesDailyAllowance: number
  hasActiveBudgets: boolean
}

/**
 * Computes how much can be spent per remaining day of the current month
 * without touching next-month fixed provisions or savings goals/provisions.
 */
export function computeDailyBudgetAllowance(params: {
  accounts: Account[]
  transactions: Transaction[]
  budgets: Budget[]
  goals: SavingsGoal[]
  recurringRules: RecurringExpenseRule[]
  savingsTimeframe: string
  excludedNextMonthIds: string[]
  now?: Date
}): DailyBudgetResult {
  const {
    accounts,
    transactions,
    budgets,
    goals,
    recurringRules,
    savingsTimeframe,
    excludedNextMonthIds,
    now = new Date(),
  } = params

  const currentDay = getDate(now)
  const daysInMonth = getDaysInMonth(now)
  const daysLeftInclusive = Math.max(1, daysInMonth - currentDay + 1)
  const currentMonthKey = format(now, 'yyyy-MM')
  const nextMonthKey = format(addMonths(now, 1), 'yyyy-MM')

  // 1. Projected capital at end of current month (non-savings accounts)
  const realBalance = calculateTotalBalance(accounts, transactions, false, currentMonthKey)
  let currentMonthPendingImpact = 0
  accounts.forEach((acc) => {
    if (!acc.excludeFromTotals) {
      currentMonthPendingImpact += calculatePendingImpact(transactions, currentMonthKey, acc.id)
    }
  })
  const projectedMonthEndCapital = Number((realBalance + currentMonthPendingImpact).toFixed(2))

  // 2. Next month fixed provision (excluding user-excluded items)
  const excludedSet = new Set(excludedNextMonthIds)
  const nextMonthProvision = Number(
    transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.date.startsWith(nextMonthKey) &&
          !isTransfer(t.category) &&
          t.amount > 0 &&
          !excludedSet.has(t.id)
      )
      .reduce((sum, t) => sum + t.amount, 0)
      .toFixed(2)
  )

  // 3. Monthly savings provision suggestion
  const savingsProvision =
    savingsTimeframe === 'none'
      ? 0
      : calculateSavingsProvisions(
          accounts,
          transactions,
          goals || [],
          recurringRules || [],
          savingsTimeframe
        ).totalSuggestedMonthly

  // 4. Spendable margin for the remainder of the month without touching provisions
  const spendableMonthMargin = Number(
    (projectedMonthEndCapital - nextMonthProvision - savingsProvision).toFixed(2)
  )

  // 5. Active budget envelopes remaining (optional reference alongside free margin)
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

  const curRealByCat: Record<string, number> = {}
  const curAllByCat: Record<string, number> = {}
  transactions.forEach((t) => {
    if (t.type !== 'expense' || isTransfer(t.category)) return
    if (!t.date.startsWith(currentMonthKey)) return
    if (t.isPending && t.isIgnored) return
    const key = t.category.trim().toLowerCase()
    curAllByCat[key] = (curAllByCat[key] || 0) + t.amount
    if (!t.isPending) {
      curRealByCat[key] = (curRealByCat[key] || 0) + t.amount
    }
  })

  const totalBudgets = activeBudgets.reduce((s, b) => s + b.amount, 0)
  const curExpensesTotal = Object.values(curAllByCat).reduce((s, v) => s + v, 0)
  const unallocatedMargin = Number(
    (spendableMonthMargin + curExpensesTotal - totalBudgets).toFixed(2)
  )

  const envelopesRemaining = Number(
    activeBudgets
      .reduce((sum, b) => {
        const key = b.category.trim().toLowerCase()
        const spent = curRealByCat[key] || 0
        return sum + Math.max(0, b.amount - spent)
      }, 0)
      .toFixed(2)
  )

  return {
    daysLeftInclusive,
    currentDay,
    daysInMonth,
    projectedMonthEndCapital,
    nextMonthProvision,
    savingsProvision,
    unallocatedMargin,
    envelopesRemaining,
    spendableMonthMargin,
    dailyAllowance: Number((spendableMonthMargin / daysLeftInclusive).toFixed(2)),
    envelopesDailyAllowance: Number((envelopesRemaining / daysLeftInclusive).toFixed(2)),
    hasActiveBudgets: activeBudgets.length > 0,
  }
}
