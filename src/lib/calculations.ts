import { Transaction, CategorySummary, Account, Budget, AlertSettings } from '@/types/finance';
import { format } from 'date-fns';

export const calculateBalance = (
  transactions: Transaction[], 
  accountId?: string,
  includePending: boolean = false,
  upToEndOfMonth?: string // 'yyyy-MM' format, include transactions up to end of this month
): number => {
  let filteredTransactions = includePending 
    ? transactions 
    : transactions.filter(t => !t.isPending);
  
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
  return filteredTransactions.reduce((balance, transaction) => {
    if (transaction.type === 'income') {
      return balance + transaction.amount;
    } else {
      return balance - transaction.amount;
    }
  }, 0);
};

export const calculateAccountBalance = (
  account: Account,
  transactions: Transaction[],
  includePending: boolean = false,
  upToEndOfMonth?: string
): number => {
  const transactionBalance = calculateBalance(transactions, account.id, includePending, upToEndOfMonth);
  return account.initialBalance + transactionBalance;
};

export const calculateTotalBalance = (
  accounts: Account[],
  transactions: Transaction[],
  includePending: boolean = false,
  upToEndOfMonth?: string
): number => {
  return accounts.reduce((total, account) => {
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
    filtered = filtered.filter(t => !t.isPending);
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
    filtered = filtered.filter(t => !t.isPending);
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
        match = match && t.isPending;
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
): { pace: number, daysPassed: number, totalDays: number } => {
  const now = new Date();
  const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  
  const currentMonthExpenses = transactions.filter(t => 
    t.date.startsWith(currentMonthKey) && 
    !t.isPending && 
    t.type === 'expense' && 
    t.category !== 'Transferencia' &&
    (!accountId || t.accountId === accountId)
  ).reduce((sum, t) => sum + t.amount, 0);
  
  // Pace is how much is expected to spend by the end of the month based on current spending
  const pace = (currentMonthExpenses / (today || 1)) * daysInMonth;
  
  return {
    pace,
    daysPassed: today,
    totalDays: daysInMonth
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

export const calculateBudgetAlerts = (
  budgets: Budget[],
  categorySummaries: CategorySummary[],
  totalIncome: number,
  totalExpenses: number,
  alertSettings?: AlertSettings
) => {
  const overrides = alertSettings?.thresholdOverrides || {};
  const dismissed = alertSettings?.dismissedItems || [];
  const dismissedTotal = alertSettings?.dismissedTotal || false;

  const alerts = budgets.map(budget => {
    const summary = categorySummaries.find(s => s.category === budget.category);
    const spent = summary ? summary.total : 0;
    const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    // Default threshold 75% or custom override
    const threshold = overrides[budget.id] || 75;

    return {
      ...budget,
      spent,
      percent,
      isTriggered: percent >= threshold || percent >= 100
    };
  }).filter(b => b.isTriggered && !dismissed.includes(b.id));

  const hasDeficit = totalExpenses > totalIncome && totalIncome > 0 && !dismissedTotal;

  return {
    alerts,
    hasAlerts: alerts.length > 0 || hasDeficit,
    hasDeficit
  };
};
