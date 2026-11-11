import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { Account, Transaction } from '@/types/finance'

export interface SimulatedEvent {
  id: string
  name: string
  type: 'expense' | 'income'
  amount: number
  date: string // yyyy-MM-dd
  kind: 'one-time' | 'monthly'
  monthsCount?: number
}

export interface CashflowDayItem {
  id: string
  label: string
  amount: number
  type: 'income' | 'expense'
  isPending: boolean
  isSimulated: boolean
  accountName?: string
}

export interface CashflowDayPoint {
  date: string // yyyy-MM-dd
  label: string // dd/MM
  baseBalance: number
  simulatedBalance: number
  baseNet: number
  simulatedNet: number
  items: CashflowDayItem[]
}

export interface CashflowSimulationResult {
  days: CashflowDayPoint[]
  startingBalanceBeforeHorizon: number
  minBaseBalance: number
  minBaseDate: string
  minSimBalance: number
  minSimDate: string
  endBaseBalance: number
  endSimBalance: number
  firstSimDeficitDate: string | null
}

/**
 * Expands simulated one-time or monthly events into dated items within [startDateStr, endDateStr].
 */
function expandSimulatedEvents(
  events: SimulatedEvent[],
  startDateStr: string,
  endDateStr: string
): Map<string, CashflowDayItem[]> {
  const byDate = new Map<string, CashflowDayItem[]>()

  for (const ev of events) {
    if (!ev.date || ev.amount <= 0) continue
    const count = ev.kind === 'monthly' ? Math.max(1, ev.monthsCount || 1) : 1
    let baseDate: Date
    try {
      baseDate = parseISO(ev.date)
      if (isNaN(baseDate.getTime())) continue
    } catch {
      continue
    }

    for (let i = 0; i < count; i++) {
      const occDate = i === 0 ? baseDate : addMonths(baseDate, i)
      const occStr = format(occDate, 'yyyy-MM-dd')
      if (occStr < startDateStr || occStr > endDateStr) continue

      const list = byDate.get(occStr) || []
      list.push({
        id: `sim_${ev.id}_${i}`,
        label:
          ev.kind === 'monthly' && count > 1
            ? `${ev.name} (${i + 1}/${count})`
            : ev.name,
        amount: ev.amount,
        type: ev.type,
        isPending: true,
        isSimulated: true,
      })
      byDate.set(occStr, list)
    }
  }

  return byDate
}

/**
 * Builds a continuous daily cashflow timeline combining confirmed, pending,
 * and hypothetical simulated events purely in memory.
 */
export function buildCashflowSimulation(params: {
  accounts: Account[]
  transactions: Transaction[]
  selectedAccountId: string | 'total'
  startMonthDate: Date
  horizonMonths: number
  simulatedEvents: SimulatedEvent[]
}): CashflowSimulationResult {
  const {
    accounts,
    transactions,
    selectedAccountId,
    startMonthDate,
    horizonMonths,
    simulatedEvents,
  } = params

  const targetAccounts =
    selectedAccountId === 'total'
      ? accounts.filter((a) => !a.excludeFromTotals)
      : accounts.filter((a) => a.id === selectedAccountId)

  const targetAccountIds = new Set(targetAccounts.map((a) => a.id))
  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]))

  const horizonStart = startOfMonth(startMonthDate)
  const horizonEnd = endOfMonth(addMonths(horizonStart, Math.max(1, horizonMonths) - 1))
  const startDateStr = format(horizonStart, 'yyyy-MM-dd')
  const endDateStr = format(horizonEnd, 'yyyy-MM-dd')

  // Starting balance before horizonStart from initialBalance + confirmed transactions prior to startDateStr
  let runningBase = targetAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0)

  const realOrPendingByDate = new Map<string, CashflowDayItem[]>()

  for (const t of transactions) {
    if (!targetAccountIds.has(t.accountId)) continue
    if (t.isIgnored) continue

    const signed = t.type === 'income' ? t.amount : -t.amount

    if (!t.isPending && t.date < startDateStr) {
      runningBase += signed
      continue
    }

    if (t.date >= startDateStr && t.date <= endDateStr) {
      const list = realOrPendingByDate.get(t.date) || []
      list.push({
        id: t.id,
        label: t.description?.trim() || t.category,
        amount: t.amount,
        type: t.type,
        isPending: Boolean(t.isPending),
        isSimulated: false,
        accountName: accountNameById.get(t.accountId),
      })
      realOrPendingByDate.set(t.date, list)
    }
  }

  runningBase = Number(runningBase.toFixed(2))
  const startingBalanceBeforeHorizon = runningBase
  let runningSim = runningBase

  const simByDate = expandSimulatedEvents(simulatedEvents, startDateStr, endDateStr)

  const days: CashflowDayPoint[] = []
  let minBaseBalance = runningBase
  let minBaseDate = startDateStr
  let minSimBalance = runningSim
  let minSimDate = startDateStr
  let firstSimDeficitDate: string | null = null

  let cursor = horizonStart
  while (cursor <= horizonEnd) {
    const dateStr = format(cursor, 'yyyy-MM-dd')
    const baseItems = realOrPendingByDate.get(dateStr) || []
    const simItems = simByDate.get(dateStr) || []

    const baseNet = Number(
      baseItems
        .reduce((s, item) => (item.type === 'income' ? s + item.amount : s - item.amount), 0)
        .toFixed(2)
    )
    const simOnlyNet = Number(
      simItems
        .reduce((s, item) => (item.type === 'income' ? s + item.amount : s - item.amount), 0)
        .toFixed(2)
    )
    const simulatedNet = Number((baseNet + simOnlyNet).toFixed(2))

    runningBase = Number((runningBase + baseNet).toFixed(2))
    runningSim = Number((runningSim + simulatedNet).toFixed(2))

    if (runningBase < minBaseBalance) {
      minBaseBalance = runningBase
      minBaseDate = dateStr
    }
    if (runningSim < minSimBalance) {
      minSimBalance = runningSim
      minSimDate = dateStr
    }
    if (runningSim < -0.005 && !firstSimDeficitDate) {
      firstSimDeficitDate = dateStr
    }

    days.push({
      date: dateStr,
      label: format(cursor, 'dd/MM'),
      baseBalance: runningBase,
      simulatedBalance: runningSim,
      baseNet,
      simulatedNet,
      items: [...baseItems, ...simItems],
    })

    cursor = addDays(cursor, 1)
  }

  return {
    days,
    startingBalanceBeforeHorizon,
    minBaseBalance,
    minBaseDate,
    minSimBalance,
    minSimDate,
    endBaseBalance: runningBase,
    endSimBalance: runningSim,
    firstSimDeficitDate,
  }
}
