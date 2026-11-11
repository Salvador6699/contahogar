import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Transaction } from '@/types/finance'
import { isTransfer } from '@/lib/calculations'

export interface PendingMatchGroup {
  id: string
  transactions: Transaction[]
  totalImpact: number
  kind: 'exact-single' | 'exact-combo'
}

export interface HistoryTemplateSuggestion {
  key: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  occurrences: number
  lastDate: string
}

export interface SmartReconcileResult {
  exactMatches: PendingMatchGroup[]
  partialPending: Transaction[]
  historyTemplates: HistoryTemplateSuggestion[]
}

const EPSILON = 0.015

const getSignedImpact = (t: Transaction): number =>
  t.type === 'income' ? t.amount : -t.amount

/**
 * Finds pending transactions (single or combinations of up to 3), partial same-direction
 * pending candidates, and recent historical templates that explain a reconciliation difference.
 */
export function findReconcileSuggestions(params: {
  transactions: Transaction[]
  accountId: string
  difference: number
  stagedPendingIds?: Set<string>
  now?: Date
}): SmartReconcileResult {
  const {
    transactions,
    accountId,
    difference,
    stagedPendingIds = new Set<string>(),
    now = new Date(),
  } = params

  if (!accountId || Math.abs(difference) <= 0.01) {
    return { exactMatches: [], partialPending: [], historyTemplates: [] }
  }

  const dayDistance = (dateStr: string) => {
    try {
      return Math.abs(differenceInCalendarDays(parseISO(dateStr), now))
    } catch {
      return 9999
    }
  }

  // 1. Candidate pending transactions on this account (not ignored, not already staged)
  const pendingCandidates = transactions
    .filter(
      (t) =>
        t.accountId === accountId &&
        t.isPending &&
        !t.isIgnored &&
        t.amount > 0 &&
        !stagedPendingIds.has(t.id)
    )
    .sort((a, b) => dayDistance(a.date) - dayDistance(b.date))

  const exactMatches: PendingMatchGroup[] = []
  const usedSingleIds = new Set<string>()

  // 1a. Exact single pending matches
  for (const tx of pendingCandidates) {
    const impact = getSignedImpact(tx)
    if (Math.abs(impact - difference) < EPSILON) {
      exactMatches.push({
        id: `single_${tx.id}`,
        transactions: [tx],
        totalImpact: Number(impact.toFixed(2)),
        kind: 'exact-single',
      })
      usedSingleIds.add(tx.id)
    }
  }

  // 1b. Exact 2-item combinations (from nearest 30 pending transactions)
  const comboPool = pendingCandidates.slice(0, 30)
  const seenComboKeys = new Set<string>()

  for (let i = 0; i < comboPool.length && exactMatches.length < 5; i++) {
    for (let j = i + 1; j < comboPool.length && exactMatches.length < 5; j++) {
      const a = comboPool[i]
      const b = comboPool[j]
      if (usedSingleIds.has(a.id) && usedSingleIds.has(b.id)) continue
      const sum = getSignedImpact(a) + getSignedImpact(b)
      if (Math.abs(sum - difference) < EPSILON) {
        const key = [a.id, b.id].sort().join('|')
        if (!seenComboKeys.has(key)) {
          seenComboKeys.add(key)
          exactMatches.push({
            id: `combo2_${key}`,
            transactions: [a, b],
            totalImpact: Number(sum.toFixed(2)),
            kind: 'exact-combo',
          })
        }
      }
    }
  }

  // 1c. Exact 3-item combinations (only if no 1 or 2-item match was found)
  if (exactMatches.length === 0) {
    const triplePool = comboPool.slice(0, 18)
    for (let i = 0; i < triplePool.length && exactMatches.length < 3; i++) {
      for (let j = i + 1; j < triplePool.length && exactMatches.length < 3; j++) {
        for (let k = j + 1; k < triplePool.length && exactMatches.length < 3; k++) {
          const a = triplePool[i]
          const b = triplePool[j]
          const c = triplePool[k]
          const sum = getSignedImpact(a) + getSignedImpact(b) + getSignedImpact(c)
          if (Math.abs(sum - difference) < EPSILON) {
            const key = [a.id, b.id, c.id].sort().join('|')
            if (!seenComboKeys.has(key)) {
              seenComboKeys.add(key)
              exactMatches.push({
                id: `combo3_${key}`,
                transactions: [a, b, c],
                totalImpact: Number(sum.toFixed(2)),
                kind: 'exact-combo',
              })
            }
          }
        }
      }
    }
  }

  // 2. Partial same-direction pending candidates (useful to close gap step by step)
  const partialPending = pendingCandidates
    .filter((tx) => {
      if (usedSingleIds.has(tx.id)) return false
      const impact = getSignedImpact(tx)
      const sameDirection = impact * difference > 0
      return sameDirection && Math.abs(impact) <= Math.abs(difference) + EPSILON
    })
    .sort((a, b) => {
      // Prefer larger impact first, then closest date
      const diffAmt = Math.abs(b.amount - a.amount)
      if (diffAmt > 0.01) return b.amount - a.amount
      return dayDistance(a.date) - dayDistance(b.date)
    })
    .slice(0, 5)

  // 3. Historical templates matching exact missing amount in the last 120 days
  const expectedType: 'income' | 'expense' = difference > 0 ? 'income' : 'expense'
  const absDiff = Math.abs(difference)
  const templateMap = new Map<string, HistoryTemplateSuggestion>()

  transactions.forEach((t) => {
    if (t.accountId !== accountId) return
    if (t.isPending || t.isIgnored) return
    if (t.type !== expectedType) return
    if (isTransfer(t.category)) return
    if (Math.abs(t.amount - absDiff) >= EPSILON) return
    if (dayDistance(t.date) > 120) return

    const descNorm = (t.description || '').trim().toLowerCase()
    const key = `${t.type}_${t.category.trim().toLowerCase()}_${descNorm}_${t.amount.toFixed(2)}`
    const existing = templateMap.get(key)
    if (existing) {
      existing.occurrences += 1
      if (t.date > existing.lastDate) existing.lastDate = t.date
    } else {
      templateMap.set(key, {
        key,
        type: t.type,
        amount: t.amount,
        category: t.category.trim(),
        description: t.description?.trim() || undefined,
        occurrences: 1,
        lastDate: t.date,
      })
    }
  })

  const historyTemplates = Array.from(templateMap.values())
    .sort((a, b) => b.occurrences - a.occurrences || b.lastDate.localeCompare(a.lastDate))
    .slice(0, 4)

  return { exactMatches, partialPending, historyTemplates }
}
