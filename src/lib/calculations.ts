import { Transaction, CategorySummary, AccountType } from '@/types/finance';

export const calculateBalance = (
  initialBalance: number, 
  transactions: Transaction[], 
  includePending: boolean = false,
  account?: AccountType,
  upToEndOfMonth?: string // 'yyyy-MM' format, include transactions up to end of this month
): number => {
  let filteredTransactions = includePending 
    ? transactions 
    : transactions.filter(t => !t.isPending);
  
  // Filter by account if specified
  if (account) {
    filteredTransactions = filteredTransactions.filter(t => t.account === account);
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
    
  return filteredTransactions.reduce((balance, transaction) => {
    if (transaction.type === 'income') {
      return balance + transaction.amount;
    } else {
      return balance - transaction.amount;
    }
  }, initialBalance);
};

export const calculateTotalIncome = (transactions: Transaction[], includePending: boolean = false): number => {
  const filtered = includePending 
    ? transactions.filter(t => t.type === 'income')
    : transactions.filter(t => t.type === 'income' && !t.isPending);
  return filtered.reduce((sum, t) => sum + t.amount, 0);
};

export const calculateTotalExpenses = (transactions: Transaction[], includePending: boolean = false): number => {
  const filtered = includePending 
    ? transactions.filter(t => t.type === 'expense')
    : transactions.filter(t => t.type === 'expense' && !t.isPending);
  return filtered.reduce((sum, t) => sum + t.amount, 0);
};

export const calculateCategorySummaries = (
  transactions: Transaction[],
  type: 'income' | 'expense',
  onlyPending: boolean = false
): CategorySummary[] => {
  const categoryMap = new Map<string, CategorySummary>();

  transactions
    .filter(t => {
      if (onlyPending) {
        return t.type === type && t.isPending;
      }
      return t.type === type && !t.isPending;
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
