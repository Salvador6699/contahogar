import { Account, Transaction, SavingsGoal, RecurringExpenseRule, isRuleIncludedInSavings } from '../types/finance.js';
import { calculateAccountBalance } from './calculations.js';
import { parseISO, format } from 'date-fns';

export interface UnifiedSavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  isVirtual: boolean;
  ruleId?: string;
  isIgnored: boolean;
  txId?: string;
  allocatedAmount: number;
  missingAmount: number;
  monthsLeft: number;
  suggestedMonthly: number;
  currentIndex: number;
}

export interface SavingsEnvelopesSummary {
  provisionsAllocated: number;
  provisionsTarget: number;
  manualGoalsAllocated: number;
  manualGoalsTarget: number;
  placedOutsideFilter: number;
  totalInEnvelopes: number;
  unassignedSavingsCapital: number;
}

export interface SavingsCalculationResult {
  totalSavingsCapital: number;
  unifiedGoals: UnifiedSavingsGoal[];
  totalSuggestedMonthly: number;
  limitDateStr: string | null;
  envelopesSummary: SavingsEnvelopesSummary;
}

export interface SavingsProvisionOptions {
  useEnvelopeBalances?: boolean;
  envelopeBalances?: Record<string, number>;
}

/**
 * Normalizes legacy month-based timeframe values (e.g. "3", "13") into
 * a target year string (defaulting to next year) or "none".
 */
export const normalizeSavingsTimeframe = (raw: string | null | undefined): string => {
  if (raw === 'none' || raw === '0') return 'none';
  if (raw && /^\d{4}$/.test(raw.trim())) return raw.trim();
  return String(new Date().getFullYear() + 1);
};

/**
 * Returns selectable year options for savings provisions.
 */
export const getSavingsYearOptions = (): { value: string; label: string }[] => {
  const currentYear = new Date().getFullYear();
  return [
    { value: String(currentYear), label: `Solo este año (${currentYear})` },
    { value: String(currentYear + 1), label: `Hasta fin de ${currentYear + 1}` },
    { value: String(currentYear + 2), label: `Hasta fin de ${currentYear + 2}` },
    { value: String(currentYear + 3), label: `Hasta fin de ${currentYear + 3}` },
  ];
};

/**
 * Calculates savings goals, virtual recurring goals, capital distribution,
 * and total monthly suggested contribution for a given target year.
 */
export const calculateSavingsProvisions = (
  accounts: Account[],
  transactions: Transaction[],
  savingsGoals: SavingsGoal[],
  recurringRules: RecurringExpenseRule[],
  timeframeMonths: string,
  options?: SavingsProvisionOptions
): SavingsCalculationResult => {
  const normalizedTimeframe = normalizeSavingsTimeframe(timeframeMonths);
  const isNoProvision = normalizedTimeframe === 'none';

  // 1. Calculate Total Savings Balance (Accounts with excludeFromTotals === true)
  const savingsAccounts = accounts.filter(a => a.excludeFromTotals);
  const totalSavingsCapital = savingsAccounts.reduce((total, acc) => {
    return total + calculateAccountBalance(acc, transactions);
  }, 0);

  // 2. Limit date for filtering (December 31 of the chosen year)
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const limitDateStr = isNoProvision ? null : `${normalizedTimeframe}-12-31`;

  // 3. Gather Manual Goals (Filtered by timeframe)
  const manualGoals = (savingsGoals || [])
    .filter(g => !limitDateStr || !g.deadline || g.deadline <= limitDateStr)
    .map(g => ({
      ...g,
      isVirtual: false,
      isIgnored: !!g.isIgnored,
    }));

  // 4. Gather Virtual Goals from long-term Recurring Rules
  const virtualGoals: any[] = [];

  (recurringRules || [])
    .filter(isRuleIncludedInSavings)
    .forEach(r => {
      const txs = transactions
        .filter(t => t.isPending && t.id.startsWith(`rec_${r.id}_`) && t.date >= todayStr && (!limitDateStr || t.date <= limitDateStr))
        .sort((a, b) => a.date.localeCompare(b.date));

      txs.forEach((tx, idx) => {
        const year = tx.date.split('-')[0];
        const isYearly = r.frequency === 'yearly' || r.frequency === 'Anual' as any;
        const suffix = isYearly ? ` (${year})` : (txs.length > 1 ? ` (${idx + 1})` : '');

        virtualGoals.push({
          id: `virtual_${r.id}_${tx.date}`,
          name: r.name + suffix,
          targetAmount: r.amount,
          currentAmount: 0,
          deadline: tx.date,
          category: r.category,
          isVirtual: true,
          ruleId: r.id,
          isIgnored: !!tx.isIgnored,
          txId: tx.id,
        });
      });
    });

  // 5. Combine and Sort by deadline (most imminent first)
  const allGoals = [...manualGoals, ...virtualGoals];

  allGoals.sort((a, b) => {
    if (a.isIgnored !== b.isIgnored) return a.isIgnored ? 1 : -1;
    if (a.deadline && b.deadline) {
      const cmp = a.deadline.localeCompare(b.deadline);
      if (cmp !== 0) return cmp;
    } else if (a.deadline || b.deadline) {
      return a.deadline ? -1 : 1;
    }
    const nameCmp = (a.name || '').localeCompare(b.name || '');
    if (nameCmp !== 0) return nameCmp;
    return String(a.id).localeCompare(String(b.id));
  });

  let remainingCapital = totalSavingsCapital;
  const useEnvelopeBalances = Boolean(options?.useEnvelopeBalances);
  const envelopeBalances = options?.envelopeBalances ?? {};

  const unifiedGoals: UnifiedSavingsGoal[] = allGoals.map((goal, index) => {
    const needed = goal.targetAmount;
    let allocated = 0;

    if (!goal.isIgnored) {
      if (useEnvelopeBalances) {
        const rawBalance = goal.isVirtual
          ? (envelopeBalances[goal.id] ?? 0)
          : (goal.currentAmount ?? 0);
        allocated = Math.max(0, Number(rawBalance) || 0);
      } else {
        allocated = Math.min(needed, remainingCapital);
        remainingCapital -= allocated;
      }
    }

    const missing = Math.max(0, needed - allocated);
    let monthsLeft = 1;
    if (goal.deadline) {
      const targetDate = parseISO(goal.deadline);
      const diff = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
      monthsLeft = Math.max(1, diff);
    }

    const suggestedMonthly = missing / monthsLeft;

    return {
      ...goal,
      allocatedAmount: Number(allocated.toFixed(2)),
      missingAmount: Number(missing.toFixed(2)),
      monthsLeft,
      suggestedMonthly: isNoProvision || goal.isIgnored ? 0 : suggestedMonthly,
      currentIndex: index,
    };
  });

  if (useEnvelopeBalances) {
    unifiedGoals.sort((a, b) => {
      if (a.isIgnored !== b.isIgnored) return a.isIgnored ? 1 : -1;
      const aCovered = a.allocatedAmount >= a.targetAmount;
      const bCovered = b.allocatedAmount >= b.targetAmount;
      if (aCovered !== bCovered) return aCovered ? 1 : -1;
      if (a.deadline && b.deadline) {
        const cmp = a.deadline.localeCompare(b.deadline);
        if (cmp !== 0) return cmp;
      } else if (a.deadline || b.deadline) {
        return a.deadline ? -1 : 1;
      }
      const nameCmp = (a.name || '').localeCompare(b.name || '');
      if (nameCmp !== 0) return nameCmp;
      return String(a.id).localeCompare(String(b.id));
    });
    unifiedGoals.forEach((g, idx) => {
      g.currentIndex = idx;
    });
  }

  const totalSuggestedMonthly = isNoProvision
    ? 0
    : unifiedGoals.reduce((sum, goal) => {
        if (!goal.isIgnored && goal.allocatedAmount < goal.targetAmount) {
          return sum + goal.suggestedMonthly;
        }
        return sum;
      }, 0);

  const activeGoals = unifiedGoals.filter((g) => !g.isIgnored);
  const provisionsAllocated = Number(
    activeGoals.filter((g) => g.isVirtual).reduce((sum, g) => sum + g.allocatedAmount, 0).toFixed(2)
  );
  const provisionsTarget = Number(
    activeGoals.filter((g) => g.isVirtual).reduce((sum, g) => sum + g.targetAmount, 0).toFixed(2)
  );
  const manualGoalsAllocated = Number(
    activeGoals.filter((g) => !g.isVirtual).reduce((sum, g) => sum + g.allocatedAmount, 0).toFixed(2)
  );
  const manualGoalsTarget = Number(
    activeGoals.filter((g) => !g.isVirtual).reduce((sum, g) => sum + g.targetAmount, 0).toFixed(2)
  );

  // Accounting truth: total placed across ALL years (never hidden by the year filter)
  const totalManualPlacedAll = useEnvelopeBalances
    ? (savingsGoals || [])
        .filter((g) => !g.isIgnored)
        .reduce((sum, g) => sum + Math.max(0, Number(g.currentAmount) || 0), 0)
    : manualGoalsAllocated;

  const totalProvisionsPlacedAll = useEnvelopeBalances
    ? (recurringRules || [])
        .filter(isRuleIncludedInSavings)
        .reduce((ruleSum, r) => {
          const futureTxs = transactions.filter(
            (t) =>
              t.isPending &&
              !t.isIgnored &&
              t.id.startsWith(`rec_${r.id}_`) &&
              t.date >= todayStr
          );
          return (
            ruleSum +
            futureTxs.reduce((txSum, tx) => {
              const id = `virtual_${r.id}_${tx.date}`;
              return txSum + Math.max(0, Number(envelopeBalances[id]) || 0);
            }, 0)
          );
        }, 0)
    : provisionsAllocated;

  const totalInEnvelopes = Number((totalProvisionsPlacedAll + totalManualPlacedAll).toFixed(2));
  const placedInFilter = Number((provisionsAllocated + manualGoalsAllocated).toFixed(2));
  const placedOutsideFilter = Number(Math.max(0, totalInEnvelopes - placedInFilter).toFixed(2));
  const unassignedSavingsCapital = Number((totalSavingsCapital - totalInEnvelopes).toFixed(2));

  return {
    totalSavingsCapital: Number(totalSavingsCapital.toFixed(2)),
    unifiedGoals,
    totalSuggestedMonthly: Number(totalSuggestedMonthly.toFixed(2)),
    limitDateStr,
    envelopesSummary: {
      provisionsAllocated,
      provisionsTarget,
      manualGoalsAllocated,
      manualGoalsTarget,
      placedOutsideFilter,
      totalInEnvelopes,
      unassignedSavingsCapital,
    },
  };
};
