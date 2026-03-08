import { FinanceData, Transaction, AccountType } from '@/types/finance';

const STORAGE_KEY = 'finance_app_data';

const defaultData: FinanceData = {
  initialBankBalance: 0,
  initialCashBalance: 0,
  transactions: [],
  categories: [],
};

export const loadData = (): FinanceData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultData;
    const data = JSON.parse(stored);
    // Migration: convert old initialBalance to new structure
    if ('initialBalance' in data && !('initialBankBalance' in data)) {
      data.initialBankBalance = data.initialBalance;
      data.initialCashBalance = 0;
      delete data.initialBalance;
      // Add account field to existing transactions (default to bank)
      data.transactions = data.transactions.map((t: Transaction) => ({
        ...t,
        account: t.account || 'bank',
      }));
      saveData(data);
    }
    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    return defaultData;
  }
};

export const saveData = (data: FinanceData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

export const addTransaction = (transaction: Transaction): void => {
  const data = loadData();
  data.transactions.push(transaction);
  saveData(data);
};

export const updateTransaction = (updatedTransaction: Transaction): void => {
  const data = loadData();
  const index = data.transactions.findIndex(t => t.id === updatedTransaction.id);
  if (index !== -1) {
    data.transactions[index] = updatedTransaction;
    saveData(data);
  }
};

export const deleteTransaction = (transactionId: string): void => {
  const data = loadData();
  data.transactions = data.transactions.filter(t => t.id !== transactionId);
  saveData(data);
};

export const updateInitialBalance = (account: AccountType, balance: number): void => {
  const data = loadData();
  if (account === 'bank') {
    data.initialBankBalance = balance;
  } else {
    data.initialCashBalance = balance;
  }
  saveData(data);
};

export const addCategory = (category: string): void => {
  const data = loadData();
  const normalized = normalizeCategory(category);
  
  // Check if category already exists (normalized comparison)
  const exists = data.categories.some(
    cat => normalizeCategory(cat) === normalized
  );
  
  if (!exists) {
    data.categories.push(category);
    saveData(data);
  }
};

// Normalize category for comparison
export const normalizeCategory = (category: string): string => {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[ao]$/i, ''); // Remove gender endings (o/a)
};

// Find similar categories
export const findSimilarCategory = (input: string, categories: string[]): string | null => {
  const normalized = normalizeCategory(input);
  
  for (const category of categories) {
    if (normalizeCategory(category) === normalized) {
      return category;
    }
  }
  
  return null;
};

// Get category suggestions based on input
export const getCategorySuggestions = (input: string, categories: string[]): string[] => {
  if (!input) return categories;
  
  const normalized = normalizeCategory(input);
  
  return categories.filter(category => 
    normalizeCategory(category).includes(normalized)
  );
};
