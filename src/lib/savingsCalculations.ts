import { Account, Transaction, SavingsGoal, RecurringExpenseRule, isRuleIncludedInSavings } from '@/types/finance';
import { calculateAccountBalance } from '@/lib/calculations';
import { endOfMonth, addMonths, parseISO } from 'date-fns';

export interface UnifiedSavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  priority: number;
  isVirtual: boolean;
  ruleId?: string;
  isIgnored: boolean;
  txId?: string;
  allocatedAmount: number;
  missingAmount: number;
  monthsLeft: number;
  suggestedMonthly: number;
  currentIndex: number;
  displayPriority: string | number;
}

export interface SavingsCalculationResult {
  totalSavingsCapital: number;
  unifiedGoals: UnifiedSavingsGoal[];
  totalSuggestedMonthly: number;
  limitDateStr: string | null;
}

/**
 * Calculates savings goals, virtual recurring goals, capital distribution,
 * and total monthly suggested contribution for a given timeframe.
 */
export const calculateSavingsProvisions = (
  accounts: Account[],
  transactions: Transaction[],
  savingsGoals: SavingsGoal[],
  recurringRules: RecurringExpenseRule[],
  timeframeMonths: string
): SavingsCalculationResult => {
  if (timeframeMonths === 'none' || timeframeMonths === '0') {
    return {
      totalSavingsCapital: 0,
      unifiedGoals: [],
      totalSuggestedMonthly: 0,
      limitDateStr: null,
    };
  }

  // 1. Calculate Total Savings Balance (Accounts with excludeFromTotals === true)
  const savingsAccounts = accounts.filter(a => a.excludeFromTotals);
  const totalSavingsCapital = savingsAccounts.reduce((total, acc) => {
    return total + calculateAccountBalance(acc, transactions);
  }, 0);

  // 2. Limit date for filtering
  const today = new Date();
  const monthsNum = parseInt(timeframeMonths, 10);
  const limitDateStr = isNaN(monthsNum)
    ? null
    : endOfMonth(addMonths(today, monthsNum)).toISOString().split('T')[0];

  // 3. Gather Manual Goals (Filtered by timeframe)
  const manualGoals = (savingsGoals || [])
    .filter(g => !limitDateStr || !g.deadline || g.deadline <= limitDateStr)
    .map(g => ({
      ...g,
      isVirtual: false,
      priority: g.priority || 999,
      isIgnored: !!g.isIgnored,
    }));

  // 4. Gather Virtual Goals from long-term Recurring Rules
  const todayStr = new Date().toISOString().split('T')[0];
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
          priority: r.savingsPriority || 999,
          isVirtual: true,
          ruleId: r.id,
          isIgnored: !!tx.isIgnored,
          txId: tx.id,
        });
      });
    });

  // 5. Combine, Sort, and Distribute Capital
  const allGoals = [...manualGoals, ...virtualGoals];

  allGoals.sort((a, b) => {
    if (a.isIgnored && !b.isIgnored) return 1;
    if (!a.isIgnored && b.isIgnored) return -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    return 0;
  });

  let remainingCapital = totalSavingsCapital;
  let activePriorityCount = 0;

  const unifiedGoals: UnifiedSavingsGoal[] = allGoals.map((goal, index) => {
    const needed = goal.targetAmount;
    let allocated = 0;

    if (!goal.isIgnored) {
      allocated = Math.min(needed, remainingCapital);
      remainingCapital -= allocated;
      activePriorityCount++;
    }

    const missing = needed - allocated;
    let monthsLeft = 1;
    if (goal.deadline) {
      const targetDate = parseISO(goal.deadline);
      const currentDate = new Date();
      const diff = (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + (targetDate.getMonth() - currentDate.getMonth());
      monthsLeft = Math.max(1, diff);
    }

    const suggestedMonthly = missing / monthsLeft;

    return {
      ...goal,
      allocatedAmount: allocated,
      missingAmount: missing,
      monthsLeft,
      suggestedMonthly: goal.isIgnored ? 0 : suggestedMonthly,
      currentIndex: index,
      displayPriority: goal.isIgnored ? '-' : activePriorityCount,
    };
  });

  const totalSuggestedMonthly = unifiedGoals.reduce((sum, goal) => {
    if (!goal.isIgnored && goal.allocatedAmount < goal.targetAmount) {
      return sum + goal.suggestedMonthly;
    }
    return sum;
  }, 0);

  return {
    totalSavingsCapital: Number(totalSavingsCapital.toFixed(2)),
    unifiedGoals,
    totalSuggestedMonthly: Number(totalSuggestedMonthly.toFixed(2)),
    limitDateStr,
  };
};
