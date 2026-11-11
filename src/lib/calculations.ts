import { Transaction, CategorySummary, Account, AlertSettings } from '@/types/finance';
import { format } from 'date-fns';
import { isTransfer } from './utils';
export { parseAmount, isTransfer } from './utils';

export const calculateBalance = (
  transactions: Transaction[], 
  accountId?: string,
  includePending: boolean = false,
  upToEndOfMonth?: string // 'yyyy-MM' format, include transactions up to end of this month
): number => {
  let filteredTransactions = includePending 
    ? transactions.filter(t => !t.isIgnored) 
    : transactions.filter(t => !t.isPending && !t.isIgnored);
  
  // Filter by account if specified
  if (accountId) {
    filteredTransactions = filteredTransactions.filter(t => t.accountId === accountId);
  }

  // Filter transactions up to end of selected month
  if (upToEndOfMonth) {
    const [year, month] = upToEndOfMonth.split('-').map(Number);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
    filteredTransactions = filteredTransactions.filter(t => {
      const d = new Date(t.date + 'T23:59:59');
      return d <= endOfMonth;
    });
  }

  // Calculate balance considering account's initial balance
  return Number(filteredTransactions.reduce((balance, transaction) => {
    if (transaction.type === 'income') {
      return balance + transaction.amount;
    } else {
      return balance - transaction.amount;
    }
  }, 0).toFixed(2));
};

/**
 * Calculates the net impact of pending (non-ignored) transactions
 * for a specific month and optionally a specific account.
 * Incomes add, expenses subtract.
 */
export const calculatePendingImpact = (
  transactions: Transaction[],
  monthKey: string,
  accountId?: string
): number => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return Number(transactions
    .filter(t => {
      if (!t.isPending || t.isIgnored) return false;
      if (accountId && t.accountId !== accountId) return false;

      const txMonth = t.date.substring(0, 7);
      if (monthKey > currentMonthKey) {
        return txMonth >= currentMonthKey && txMonth <= monthKey;
      }
      return txMonth === monthKey;
    })
    .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0)
    .toFixed(2));
};

export const calculateAccountBalance = (
  account: Account,
  transactions: Transaction[],
  includePending: boolean = false,
  upToEndOfMonth?: string
): number => {
  const transactionBalance = calculateBalance(transactions, account.id, includePending, upToEndOfMonth);
  return Number((account.initialBalance + transactionBalance).toFixed(2));
};

export const calculateTotalBalance = (
  accounts: Account[],
  transactions: Transaction[],
  includePending: boolean = false,
  upToEndOfMonth?: string,
  excludeSavings: boolean = true
): number => {
  return accounts.reduce((total, account) => {
    if (excludeSavings && account.excludeFromTotals) return total;
    return total + calculateAccountBalance(account, transactions, includePending, upToEndOfMonth);
  }, 0);
};

export const calculateTotalIncome = (
  transactions: Transaction[], 
  accountId?: string,
  includePending: boolean = false
): number => {
  let filtered = transactions.filter(t => t.type === 'income');
  
  if (!includePending) {
    filtered = filtered.filter(t => !t.isPending && !t.isIgnored);
  } else {
    filtered = filtered.filter(t => !t.isIgnored);
  }
  
  if (accountId) {
    filtered = filtered.filter(t => t.accountId === accountId);
  }
  
  return filtered.reduce((sum, t) => sum + t.amount, 0);
};

export const calculateTotalExpenses = (
  transactions: Transaction[], 
  accountId?: string,
  includePending: boolean = false
): number => {
  let filtered = transactions.filter(t => t.type === 'expense');
  
  if (!includePending) {
    filtered = filtered.filter(t => !t.isPending && !t.isIgnored);
  } else {
    filtered = filtered.filter(t => !t.isIgnored);
  }
  
  if (accountId) {
    filtered = filtered.filter(t => t.accountId === accountId);
  }
  
  return filtered.reduce((sum, t) => sum + t.amount, 0);
};

export const calculateCategorySummaries = (
  transactions: Transaction[],
  type: 'income' | 'expense',
  accountId?: string,
  onlyPending: boolean = false
): CategorySummary[] => {
  const categoryMap = new Map<string, CategorySummary>();

  transactions
    .filter(t => {
      let match = t.type === type;
      
      if (onlyPending) {
        match = match && !!t.isPending;
      } else {
        match = match && !t.isPending;
      }
      
      if (accountId) {
        match = match && t.accountId === accountId;
      }
      
      return match;
    })
    .forEach(transaction => {
      const existing = categoryMap.get(transaction.category);
      if (existing) {
        existing.total += transaction.amount;
        existing.count += 1;
      } else {
        categoryMap.set(transaction.category, {
          category: transaction.category,
          total: transaction.amount,
          count: 1,
        });
      }
    });

  return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export interface CategoryMonthlyAverage {
  category: string;
  average: number;
  totalAmount: number;
  transactionCount: number;
  monthsCount: number;
  isRegular: boolean;
  type: 'income' | 'expense';
  lastDate?: string;
}


export const calculateMonthlyAverages = (transactions: Transaction[]): CategoryMonthlyAverage[] => {
  const categories: Record<string, { total: number; months: Set<string>; count: number; type: 'income' | 'expense', lastDate: string }> = {};

  transactions.forEach(t => {
    if (t.category === 'Transferencia') return;
    const month = t.date.substring(0, 7);
    if (!categories[t.category]) {
      categories[t.category] = { total: 0, months: new Set(), count: 0, type: t.type, lastDate: t.date };
    }
    categories[t.category].total += t.amount;
    categories[t.category].months.add(month);
    categories[t.category].count += 1;
    if (t.date > categories[t.category].lastDate) {
      categories[t.category].lastDate = t.date;
    }
  });

  return Object.entries(categories).map(([category, data]) => {
    const monthsCount = data.months.size;
    return {
      category,
      average: Math.round(data.total / (monthsCount || 1)),
      totalAmount: data.total,
      transactionCount: data.count,
      monthsCount: monthsCount,
      isRegular: monthsCount >= 3,
      type: data.type,
      lastDate: data.lastDate
    };
  }).sort((a, b) => b.average - a.average);
};


export interface FilterCriteria {
  query?: string;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  accounts?: string[];
  minAmount?: number;
  maxAmount?: number;
  type?: 'income' | 'expense' | 'all';
  includePending?: boolean;
}

export const filterTransactions = (
  transactions: Transaction[],
  criteria: FilterCriteria
): Transaction[] => {
  return transactions.filter(t => {
    // Filter by pending status
    if (!criteria.includePending && t.isPending) return false;
    if (criteria.includePending && t.isIgnored) return false;

    // Filter by type
    if (criteria.type && criteria.type !== 'all' && t.type !== criteria.type) return false;

    // Filter by search query (description or category)
    if (criteria.query) {
      const q = criteria.query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const desc = (t.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cat = t.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!desc.includes(q) && !cat.includes(q)) return false;
    }

    // Filter by date range
    if (criteria.startDate && t.date < criteria.startDate) return false;
    if (criteria.endDate && t.date > criteria.endDate) return false;

    // Filter by categories
    if (criteria.categories && criteria.categories.length > 0 && !criteria.categories.includes(t.category)) return false;

    // Filter by accounts
    if (criteria.accounts && criteria.accounts.length > 0 && !criteria.accounts.includes(t.accountId)) return false;

    // Filter by amount
    if (criteria.minAmount !== undefined && t.amount < criteria.minAmount) return false;
    if (criteria.maxAmount !== undefined && t.amount > criteria.maxAmount) return false;

    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
};

export interface AccountCoverageSummary {
  accountId: string;
  accountName: string;
  accountLogo?: string;
  excludeFromTotals?: boolean;
  currentBalance: number;
  projectedBalance: number;
  realizedIncome: number;
  pendingIncome: number;
  totalIncome: number;
  fixedPaid: number;
  fixedPending: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  netTransfers: number;
  marginAfterFixed: number;
  monthlyNet: number;
  fixedRatioPercent: number;
}

/**
 * Computes per-account monthly income vs fixed/pending expenses coverage
 * for the selected month key ('yyyy-MM').
 */
export const calculateAccountMonthlyCoverage = (
  accounts: Account[],
  transactions: Transaction[],
  monthKey: string
): AccountCoverageSummary[] => {
  return accounts
    .filter((acc) => !acc.linkedAccountId)
    .map((account) => {
      const currentBalance = calculateAccountBalance(account, transactions, false, monthKey);
      const pendingImpact = calculatePendingImpact(transactions, monthKey, account.id);
      const projectedBalance = Number((currentBalance + pendingImpact).toFixed(2));

      let realizedIncome = 0;
      let pendingIncome = 0;
      let fixedPaid = 0;
      let fixedPending = 0;
      let variableExpenses = 0;
      let netTransfers = 0;

      for (const t of transactions) {
        if (t.isIgnored || t.accountId !== account.id) continue;
        if (!t.date.startsWith(monthKey)) continue;

        if (isTransfer(t.category)) {
          if (!t.isPending) {
            netTransfers += t.type === 'income' ? t.amount : -t.amount;
          }
          continue;
        }

        if (t.type === 'income') {
          if (t.isPending) {
            pendingIncome += t.amount;
          } else {
            realizedIncome += t.amount;
          }
        } else {
          const isFixedOrPlanned =
            t.id.startsWith('rec_') || !!t.linkedLoanId || !!t.isPending;

          if (isFixedOrPlanned) {
            if (t.isPending) {
              fixedPending += t.amount;
            } else {
              fixedPaid += t.amount;
            }
          } else {
            variableExpenses += t.amount;
          }
        }
      }

      const round = (n: number) => Number(n.toFixed(2));
      realizedIncome = round(realizedIncome);
      pendingIncome = round(pendingIncome);
      const totalIncome = round(realizedIncome + pendingIncome);
      fixedPaid = round(fixedPaid);
      fixedPending = round(fixedPending);
      const fixedExpenses = round(fixedPaid + fixedPending);
      variableExpenses = round(variableExpenses);
      const totalExpenses = round(fixedExpenses + variableExpenses);
      netTransfers = round(netTransfers);
      const marginAfterFixed = round(totalIncome - fixedExpenses);
      const monthlyNet = round(totalIncome - totalExpenses);
      const fixedRatioPercent =
        totalIncome > 0
          ? Math.round((fixedExpenses / totalIncome) * 100)
          : fixedExpenses > 0
            ? 100
            : 0;

      return {
        accountId: account.id,
        accountName: account.name,
        accountLogo: account.logo,
        excludeFromTotals: account.excludeFromTotals,
        currentBalance,
        projectedBalance,
        realizedIncome,
        pendingIncome,
        totalIncome,
        fixedPaid,
        fixedPending,
        fixedExpenses,
        variableExpenses,
        totalExpenses,
        netTransfers,
        marginAfterFixed,
        monthlyNet,
        fixedRatioPercent,
      };
    });
};

export interface IntramesDeficitAlert {
  accountId: string;
  accountName: string;
  startingBalance: number;
  projectedBalance: number;
  firstDeficitDate: string;
  firstDeficitBalance: number;
  minBalance: number;
  minBalanceDate: string;
  triggerDescriptions: string[];
  recoversByMonthEnd: boolean;
}

/**
 * Checks pending transactions chronologically per account for a given month
 * to detect intermediate days where the balance drops below zero.
 */
export const calculateIntramesDeficitAlerts = (
  accounts: Account[],
  transactions: Transaction[],
  monthKey: string
): IntramesDeficitAlert[] => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (monthKey < currentMonthKey) {
    return [];
  }

  const alerts: IntramesDeficitAlert[] = [];

  for (const account of accounts) {
    if (account.linkedAccountId) continue;

    const startingBalance = calculateAccountBalance(account, transactions, false, monthKey);
    const pendingImpact = calculatePendingImpact(transactions, monthKey, account.id);
    const projectedBalance = Number((startingBalance + pendingImpact).toFixed(2));

    const pendingTxs = transactions.filter((t) => {
      if (!t.isPending || t.isIgnored || t.accountId !== account.id) return false;
      const txMonth = t.date.substring(0, 7);
      if (monthKey > currentMonthKey) {
        return txMonth >= currentMonthKey && txMonth <= monthKey;
      }
      return txMonth === monthKey;
    });

    const hasPendingExpense = pendingTxs.some((t) => t.type === 'expense');
    if (!hasPendingExpense) continue;

    const byDate = new Map<string, Transaction[]>();
    for (const tx of pendingTxs) {
      const list = byDate.get(tx.date) || [];
      list.push(tx);
      byDate.set(tx.date, list);
    }

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));

    let runningBalance = startingBalance;
    let firstDeficitDate = '';
    let firstDeficitBalance = 0;
    let triggerDescriptions: string[] = [];
    let minBalance = startingBalance;
    let minBalanceDate = '';

    for (const date of sortedDates) {
      const dayTxs = byDate.get(date)!;
      const dayNet = dayTxs.reduce(
        (sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount),
        0
      );
      const dayExpenses = dayTxs.filter((t) => t.type === 'expense');

      runningBalance = Number((runningBalance + dayNet).toFixed(2));

      if (runningBalance < -0.005 && dayExpenses.length > 0 && !firstDeficitDate) {
        firstDeficitDate = date;
        firstDeficitBalance = runningBalance;
        triggerDescriptions = dayExpenses.map(
          (t) => t.description?.trim() || t.category
        );
      }

      if (runningBalance < minBalance) {
        minBalance = runningBalance;
        minBalanceDate = date;
      }
    }

    if (firstDeficitDate && minBalance < -0.005) {
      alerts.push({
        accountId: account.id,
        accountName: account.name,
        startingBalance,
        projectedBalance,
        firstDeficitDate,
        firstDeficitBalance,
        minBalance,
        minBalanceDate: minBalanceDate || firstDeficitDate,
        triggerDescriptions,
        recoversByMonthEnd: projectedBalance >= -0.005,
      });
    }
  }

  return alerts;
};

export interface MonthlyHistory {
  month: string;
  income: number;
  expense: number;
  incomeUpToDay: number;
  expenseUpToDay: number;
}

export const calculatePastMonthsHistory = (
  transactions: Transaction[],
  accountId?: string,
  monthsCount: number = 6,
  baseDate: Date = new Date()
): MonthlyHistory[] => {
  const history: MonthlyHistory[] = [];
  const realToday = new Date();
  const dayToCompare = baseDate.getMonth() === realToday.getMonth() && baseDate.getFullYear() === realToday.getFullYear()
    ? realToday.getDate()
    : 31; // For past months, we usually want full comparison, but user can specify. 
          // However, the request said "como los de actual", let's use the same day logic if it's the current month.
  
  // Actually, let's just use the current day of the month for comparison as requested
  const today = realToday.getDate();

  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const monthKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    
    const monthTransactions = transactions.filter(t => 
      t.date.startsWith(monthKey) && 
      (!t.isPending || t.date < format(realToday, 'yyyy-MM-dd')) && 
      t.category !== 'Transferencia' &&
      (!accountId || t.accountId === accountId)
    );
    
    // Total for the whole month
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Total up to the same day of the month (for fair comparison)
    const incomeUpToDay = monthTransactions
      .filter(t => t.type === 'income' && parseInt(t.date.split('-')[2]) <= today)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseUpToDay = monthTransactions
      .filter(t => t.type === 'expense' && parseInt(t.date.split('-')[2]) <= today)
      .reduce((sum, t) => sum + t.amount, 0);
      
    history.unshift({
      month: monthKey,
      income: totalIncome,
      expense: totalExpense,
      incomeUpToDay,
      expenseUpToDay
    });
  }
  
  return history;
};

export const calculateSpendingPace = (
  transactions: Transaction[],
  accountId?: string
): { 
  pace: number, 
  daysPassed: number, 
  totalDays: number,
  currentMonthExpenses: number,
  previousMonthRemainingExpenses: number,
  previousMonthRemainingCategories: { category: string, amount: number }[]
} => {
  const now = new Date();
  const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  
  // Get previous month key
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = prevMonthDate.getFullYear() + '-' + String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  
  const currentMonthExpenses = transactions.filter(t => 
    t.date.startsWith(currentMonthKey) && 
    !t.isPending && 
    t.type === 'expense' && 
    t.category !== 'Transferencia' &&
    (!accountId || t.accountId === accountId)
  ).reduce((sum, t) => sum + t.amount, 0);
  
  const previousMonthRemainingTransactions = transactions.filter(t => {
    if (!t.date.startsWith(prevMonthKey) || t.isPending || t.type !== 'expense' || t.category === 'Transferencia') {
      return false;
    }
    if (accountId && t.accountId !== accountId) {
      return false;
    }
    const transactionDay = parseInt(t.date.split('-')[2], 10);
    return transactionDay >= today;
  });

  const previousMonthRemainingExpenses = previousMonthRemainingTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryMap = new Map<string, number>();
  previousMonthRemainingTransactions.forEach(t => {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
  });
  
  const previousMonthRemainingCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  
  const pace = currentMonthExpenses + previousMonthRemainingExpenses;
  
  return {
    pace,
    daysPassed: today,
    totalDays: daysInMonth,
    currentMonthExpenses,
    previousMonthRemainingExpenses,
    previousMonthRemainingCategories
  };
};

export const calculateCategoryHistory = (
  transactions: Transaction[],
  categoryName: string,
  type: 'income' | 'expense',
  monthsCount: number = 6,
  accountId?: string,
  baseDate: Date = new Date()
): { month: string, total: number, totalUpToDay: number }[] => {
  const history: { month: string, total: number, totalUpToDay: number }[] = [];
  const realToday = new Date();
  const today = realToday.getDate();
  
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const monthKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    
    const monthTransactions = transactions.filter(t => 
      t.date.startsWith(monthKey) && 
      !t.isPending && 
      t.type === type &&
      t.category.toLowerCase() === categoryName.toLowerCase() &&
      (!accountId || t.accountId === accountId)
    );
    
    const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const totalUpToDay = monthTransactions
      .filter(t => parseInt(t.date.split('-')[2]) <= today)
      .reduce((sum, t) => sum + t.amount, 0);
      
    history.unshift({
      month: monthKey,
      total,
      totalUpToDay
    });
  }
  
  return history;
};

