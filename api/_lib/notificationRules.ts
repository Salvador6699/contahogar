import {
  calculateIntramesDeficitAlerts,
  isTransfer,
} from '../../src/lib/calculations.js';
import { calculateSavingsProvisions } from '../../src/lib/savingsCalculations.js';
import type {
  Account,
  Budget,
  RecurringExpenseRule,
  SavingsGoal,
  Transaction,
} from '../../src/types/finance.js';

export interface NotificationCandidate {
  type:
    | 'pending_2d'
    | 'intrames_deficit'
    | 'loan_upcoming_3d'
    | 'budget_threshold'
    | 'monthly_summary'
    | 'savings_goal_covered';
  dedupKey: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface EvaluationInput {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringRules: RecurringExpenseRule[];
  now?: Date;
}

const SETTING_SAVINGS_TIMEFRAME_ID = '__setting_savings_timeframe__';
const TIMEZONE = 'Europe/Madrid';

function getMadridDateParts(now: Date): {
  todayStr: string;
  currentMonthKey: string;
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // YYYY-MM-DD
  const [y, m, d] = todayStr.split('-').map(Number);
  return {
    todayStr,
    currentMonthKey: `${y}-${String(m).padStart(2, '0')}`,
    year: y,
    month: m,
    day: d,
  };
}

function addDaysYmd(year: number, month: number, day: number, deltaDays: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPrevMonthKey(year: number, month: number): { key: string; label: string } {
  const dt = new Date(Date.UTC(year, month - 2, 15));
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const key = `${y}-${String(m).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
  return { key, label };
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}`;
}

function buildPending2dNotification(
  transactions: Transaction[],
  targetDate2d: string
): NotificationCandidate | null {
  const dueSoon = transactions.filter(
    (t) => t.isPending && !t.isIgnored && !t.linkedLoanId && t.date === targetDate2d
  );

  if (dueSoon.length === 0) return null;

  const dateLabel = formatShortDate(targetDate2d);

  if (dueSoon.length === 1) {
    const tx = dueSoon[0];
    const label = tx.description?.trim() || tx.category;
    const prefix = tx.type === 'expense' ? 'Cargo' : 'Ingreso';
    return {
      type: 'pending_2d',
      dedupKey: `pending_2d_${targetDate2d}`,
      title: `⏰ Vencimiento en 2 días: ${label}`,
      body: `${prefix} previsto de ${formatEur(tx.amount)} el ${dateLabel}.`,
      url: '/proximos',
      tag: `pending-2d-${targetDate2d}`,
    };
  }

  const totalExpense = dueSoon
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = dueSoon
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const summaryParts: string[] = [];
  if (totalExpense > 0) summaryParts.push(`Gastos: ${formatEur(totalExpense)}`);
  if (totalIncome > 0) summaryParts.push(`Ingresos: ${formatEur(totalIncome)}`);

  const previewNames = dueSoon
    .slice(0, 2)
    .map((t) => t.description?.trim() || t.category)
    .join(', ');
  const extraCount = dueSoon.length > 2 ? ` y ${dueSoon.length - 2} más` : '';

  return {
    type: 'pending_2d',
    dedupKey: `pending_2d_${targetDate2d}`,
    title: `⏰ ${dueSoon.length} vencimientos el ${dateLabel}`,
    body: `${summaryParts.join(' · ')} (${previewNames}${extraCount}).`,
    url: '/proximos',
    tag: `pending-2d-${targetDate2d}`,
  };
}

function buildIntramesDeficitNotifications(
  accounts: Account[],
  transactions: Transaction[],
  currentMonthKey: string,
  todayStr: string,
  horizonStr: string
): NotificationCandidate[] {
  const alerts = calculateIntramesDeficitAlerts(accounts, transactions, currentMonthKey);
  return alerts
    .filter((a) => a.firstDeficitDate >= todayStr && a.firstDeficitDate <= horizonStr)
    .map((alert) => {
      const causes = alert.triggerDescriptions.slice(0, 2).join(', ');
      const causeSuffix = causes ? ` por ${causes}` : '';
      return {
        type: 'intrames_deficit' as const,
        dedupKey: `intrames_${alert.accountId}_${alert.firstDeficitDate}`,
        title: `⚠️ Riesgo de descubierto en ${alert.accountName}`,
        body: `Saldo previsto de ${formatEur(alert.firstDeficitBalance)} el ${formatShortDate(alert.firstDeficitDate)}${causeSuffix}.`,
        url: '/',
        tag: `intrames-${alert.accountId}-${alert.firstDeficitDate}`,
      };
    });
}

function buildLoanNotifications(
  transactions: Transaction[],
  targetDate3d: string
): NotificationCandidate[] {
  return transactions
    .filter((t) => t.isPending && !t.isIgnored && Boolean(t.linkedLoanId) && t.date === targetDate3d)
    .map((tx) => {
      const label = tx.description?.trim() || tx.category;
      return {
        type: 'loan_upcoming_3d' as const,
        dedupKey: `loan_3d_${tx.id}`,
        title: '🏦 Cuota de préstamo en 3 días',
        body: `${label}: ${formatEur(tx.amount)} el ${formatShortDate(tx.date)}.`,
        url: '/prestamos',
        tag: `loan-3d-${tx.id}`,
      };
    });
}

function buildBudgetNotifications(
  budgets: Budget[],
  transactions: Transaction[],
  currentMonthKey: string
): NotificationCandidate[] {
  const deduped = new Map<string, Budget>();
  for (const item of budgets) {
    if (!item.month || !item.category) continue;
    if (item.id?.startsWith('__setting_') || item.month.startsWith('__setting_')) continue;
    if (item.month !== currentMonthKey || item.amount <= 0) continue;

    const key = item.category.trim().toLowerCase();
    const existing = deduped.get(key);
    if (!existing || (existing.isAuto && !item.isAuto)) {
      deduped.set(key, { ...item, category: item.category.trim() });
    }
  }

  const spentByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.isPending || tx.isIgnored || tx.type !== 'expense') continue;
    if (isTransfer(tx.category)) continue;
    if (!tx.date.startsWith(currentMonthKey)) continue;

    const key = tx.category.trim().toLowerCase();
    spentByCategory.set(key, (spentByCategory.get(key) || 0) + tx.amount);
  }

  const candidates: NotificationCandidate[] = [];

  for (const [normCat, budget] of deduped.entries()) {
    const spent = spentByCategory.get(normCat) || 0;
    const ratio = spent / budget.amount;
    const pct = Math.round(ratio * 100);

    // Trigger overspend only when strictly above the budget (> 100%).
    // Trigger 80% warning only while strictly below 100% (80%..99%) so exact 100% fixed bills don't spam.
    if (spent > budget.amount + 0.005) {
      candidates.push({
        type: 'budget_threshold',
        dedupKey: `budget_100_${currentMonthKey}_${normCat}`,
        title: `🚨 Presupuesto superado: ${budget.category}`,
        body: `Llevas ${formatEur(spent)} de ${formatEur(budget.amount)} (${pct}%).`,
        url: '/presupuestos',
        tag: `budget-100-${currentMonthKey}-${normCat}`,
      });
    } else if (!budget.isAuto && ratio >= 0.8 && spent < budget.amount - 0.005) {
      candidates.push({
        type: 'budget_threshold',
        dedupKey: `budget_80_${currentMonthKey}_${normCat}`,
        title: `📊 Presupuesto al ${pct}%: ${budget.category}`,
        body: `Has gastado ${formatEur(spent)} de ${formatEur(budget.amount)} este mes.`,
        url: '/presupuestos',
        tag: `budget-80-${currentMonthKey}-${normCat}`,
      });
    }
  }

  return candidates;
}

function buildMonthlySummaryNotification(
  transactions: Transaction[],
  year: number,
  month: number
): NotificationCandidate | null {
  const { key: prevMonthKey, label } = getPrevMonthKey(year, month);
  const monthTxs = transactions.filter(
    (t) =>
      !t.isPending &&
      !t.isIgnored &&
      !isTransfer(t.category) &&
      t.date.startsWith(prevMonthKey)
  );

  if (monthTxs.length === 0) return null;

  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();

  for (const tx of monthTxs) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else {
      expense += tx.amount;
      byCategory.set(tx.category, (byCategory.get(tx.category) || 0) + tx.amount);
    }
  }

  let topCategory = '';
  let topAmount = 0;
  for (const [cat, total] of byCategory.entries()) {
    if (total > topAmount) {
      topCategory = cat;
      topAmount = total;
    }
  }

  const net = income - expense;
  const netFormatted = `${net >= 0 ? '+' : ''}${formatEur(net)}`;
  const topPart = topCategory ? ` · Top gasto: ${topCategory}` : '';

  return {
    type: 'monthly_summary',
    dedupKey: `monthly_summary_${prevMonthKey}`,
    title: `📈 Resumen de ${label}`,
    body: `Ingresos: ${formatEur(income)} · Gastos: ${formatEur(expense)} · Balance: ${netFormatted}${topPart}`,
    url: '/evolucion',
    tag: `monthly-summary-${prevMonthKey}`,
  };
}

function buildSavingsGoalNotifications(
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[],
  savingsGoals: SavingsGoal[],
  recurringRules: RecurringExpenseRule[]
): NotificationCandidate[] {
  const timeframeRow = budgets.find((b) => b.id === SETTING_SAVINGS_TIMEFRAME_ID);
  const timeframeMonths = timeframeRow?.category || '13';

  const result = calculateSavingsProvisions(
    accounts,
    transactions,
    savingsGoals,
    recurringRules,
    timeframeMonths
  );

  return result.unifiedGoals
    .filter((g) => !g.isIgnored && g.targetAmount > 0 && g.missingAmount <= 0.005)
    .map((goal) => ({
      type: 'savings_goal_covered' as const,
      dedupKey: `goal_covered_${goal.id}`,
      title: `🎯 Meta cubierta al 100%: ${goal.name}`,
      body: `Ya tienes provisionados ${formatEur(goal.targetAmount)} en tus cuentas de ahorro.`,
      url: '/ahorros',
      tag: `goal-covered-${goal.id}`,
    }));
}

/**
 * Evaluates all 6 notification rules for ContaHogar against a loaded snapshot.
 */
export function evaluateNotificationCandidates(input: EvaluationInput): NotificationCandidate[] {
  const now = input.now ?? new Date();
  const { todayStr, currentMonthKey, year, month, day } = getMadridDateParts(now);

  const targetDate2d = addDaysYmd(year, month, day, 2);
  const targetDate3d = addDaysYmd(year, month, day, 3);
  const horizon5d = addDaysYmd(year, month, day, 5);

  const candidates: NotificationCandidate[] = [];

  const pending2d = buildPending2dNotification(input.transactions, targetDate2d);
  if (pending2d) candidates.push(pending2d);

  candidates.push(
    ...buildIntramesDeficitNotifications(
      input.accounts,
      input.transactions,
      currentMonthKey,
      todayStr,
      horizon5d
    )
  );

  candidates.push(...buildLoanNotifications(input.transactions, targetDate3d));

  candidates.push(
    ...buildBudgetNotifications(input.budgets, input.transactions, currentMonthKey)
  );

  if (day === 1) {
    const monthlySummary = buildMonthlySummaryNotification(input.transactions, year, month);
    if (monthlySummary) candidates.push(monthlySummary);
  }

  candidates.push(
    ...buildSavingsGoalNotifications(
      input.accounts,
      input.transactions,
      input.budgets,
      input.savingsGoals,
      input.recurringRules
    )
  );

  return candidates;
}
