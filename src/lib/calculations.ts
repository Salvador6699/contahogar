import { Transaction, CategorySummary, Account } from '@/types/finance';

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

