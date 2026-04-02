// src/lib/storage.ts
import { FinanceData, Transaction, Account, Category, RecurringTransaction } from '@/types/finance';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'finance_app_data';

// Default accounts created for new users or migration
const defaultBank: Account = {
  id: 'default-bank-id',
  name: 'Banco',
  initialBalance: 0,
};

const defaultCash: Account = {
  id: 'default-cash-id',
  name: 'Efectivo',
  initialBalance: 0,
};

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Sueldo', icon: 'Wallet', color: '#10b981' },
  { id: 'cat-2', name: 'Comida', icon: 'Utensils', color: '#f59e0b' },
  { id: 'cat-3', name: 'Transporte', icon: 'Car', color: '#3b82f6' },
  { id: 'cat-4', name: 'Ocio', icon: 'Gamepad2', color: '#8b5cf6' },
  { id: 'cat-5', name: 'Hogar', icon: 'Home', color: '#ef4444' },
];

const getDefaultData = (): FinanceData => ({
  accounts: [defaultBank, defaultCash],
  transactions: [],
  categories: defaultCategories,
  budgets: [],
  recurringTransactions: [],
});

export const migrateData = (data: any): FinanceData => {
  if (!data || typeof data !== 'object') {
    return getDefaultData();
  }

  // Ensure recurringTransactions exists
  if (data.recurringTransactions === undefined) {
    data.recurringTransactions = [];
  }

  // If accounts array exists, assume it's new format or already partially migrated
  if (Array.isArray(data.accounts)) {
    // Ensure budgets is not optional
    if (data.budgets === undefined) {
      data.budgets = [];
    }

    // Migrate categories from string[] to Category[] if necessary
    if (Array.isArray(data.categories) && data.categories.length > 0 && typeof data.categories[0] === 'string') {
      console.log('Migrating categories from string[] to Category[]...');
      data.categories = data.categories.map((name: string, index: number) => ({
        id: `cat-${index}-${Date.now()}`,
        name,
        icon: 'Tag',
        color: '#94a3b8'
      }));
    }

    return data as FinanceData;
  }

  console.log('Migrating old data format...');

  // It's old format, let's create a new structure
  const newBank = { ...defaultBank, initialBalance: data.initialBankBalance ?? data.initialBalance ?? 0 };
  const newCash = { ...defaultCash, initialBalance: data.initialCashBalance ?? 0 };

  const migratedData: FinanceData = {
    accounts: [newBank, newCash],
    transactions: [],
    categories: Array.isArray(data.categories) && data.categories.length > 0 
      ? data.categories.map((name: string, i: number) => ({ id: `cat-mig-${i}`, name, icon: 'Tag', color: '#94a3b8' }))
      : defaultCategories,
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    recurringTransactions: [],
  };
  
  // Migrate transactions
  if (Array.isArray(data.transactions)) {
    migratedData.transactions = data.transactions.map((t: any) => ({
      ...t,
      // Assign accountId based on old 'account' field, default to bank
      accountId: t.account === 'cash' ? newCash.id : newBank.id,
      // Remove the old 'account' field
      account: undefined,
    }));
  }
  
  // Clean up undefined fields
  migratedData.transactions.forEach(t => {
      if ((t as any).account === undefined) {
          delete (t as any).account;
      }
  });

  return migratedData;
};


export const loadData = (): FinanceData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaultData = getDefaultData();
      saveData(defaultData);
      return defaultData;
    }
    const data = JSON.parse(stored);
    return migrateData(data);
  } catch (error) {
    console.error('Error loading data:', error);
    return getDefaultData();
  }
};

export const saveData = (data: FinanceData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

// Account Management
export const addAccount = (name: string, initialBalance: number): Account => {
    const data = loadData();
    const newAccount: Account = {
        id: uuidv4(),
        name,
        initialBalance,
    };
    data.accounts.push(newAccount);
    saveData(data);
    return newAccount;
};

export const updateAccount = (updatedAccount: Account): void => {
    const data = loadData();
    const index = data.accounts.findIndex(a => a.id === updatedAccount.id);
    if (index !== -1) {
        data.accounts[index] = updatedAccount;
        saveData(data);
    }
};

export const deleteAccount = (accountId: string): { success: boolean; message?: string } => {
    const data = loadData();
    
    if (data.accounts.length <= 1) {
        return { success: false, message: 'No puedes eliminar la única cuenta que queda.' };
    }

    const hasTransactions = data.transactions.some(t => t.accountId === accountId);
    if (hasTransactions) {
        return { success: false, message: 'No se puede eliminar una cuenta con transacciones asociadas.' };
    }

    data.accounts = data.accounts.filter(a => a.id !== accountId);
    saveData(data);
    return { success: true };
};


// Transaction Management
export const addTransaction = (transaction: Omit<Transaction, 'id'>): void => {
  const data = loadData();
  const newTransaction: Transaction = { ...transaction, id: uuidv4() };
  data.transactions.push(newTransaction);
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

// Category Management
export const getCategories = (): Category[] => {
  const data = loadData();
  return data.categories as Category[];
};

export const addCategory = (categoryName: string): void => {
  const data = loadData();
  const normalized = normalizeCategory(categoryName);
  
  const exists = (data.categories as any[]).some(
    cat => normalizeCategory(typeof cat === 'string' ? cat : cat.name) === normalized
  );
  
  if (!exists && categoryName.trim().length > 0) {
    const newCategory: Category = {
      id: uuidv4(),
      name: categoryName.trim(),
      icon: 'Tag',
      color: '#94a3b8'
    };
    data.categories.push(newCategory as any);
    data.categories.sort((a, b) => {
        const nameA = typeof a === 'string' ? a : a.name;
        const nameB = typeof b === 'string' ? b : b.name;
        return nameA.localeCompare(nameB);
    });
    saveData(data);
  }
};

export const updateCategory = (updated: Category): void => {
    const data = loadData();
    const index = (data.categories as any[]).findIndex(c => (typeof c === 'string' ? c : c.id) === updated.id);
    if (index !== -1) {
        data.categories[index] = updated as any;
        saveData(data);
    }
};

export const deleteCategory = (id: string): { success: boolean; message?: string } => {
    const data = loadData();
    const categoryToDelete = (data.categories as any[]).find(c => (typeof c === 'string' ? c : c.id) === id);
    const categoryName = typeof categoryToDelete === 'string' ? categoryToDelete : categoryToDelete?.name;

    const hasTransactions = data.transactions.some(t => t.category === categoryName);
    if (hasTransactions) {
        return { success: false, message: 'No se puede eliminar una categoría con transacciones.' };
    }

    data.categories = (data.categories as any[]).filter(c => (typeof c === 'string' ? c : c.id) !== id);
    saveData(data);
    return { success: true };
};

// Recurring Transaction Management
export const addRecurringTransaction = (recurring: Omit<RecurringTransaction, 'id'>): void => {
    const data = loadData();
    const newRecurring: RecurringTransaction = { ...recurring, id: uuidv4() };
    if (!data.recurringTransactions) data.recurringTransactions = [];
    data.recurringTransactions.push(newRecurring);
    saveData(data);
};

export const updateRecurringTransaction = (updated: RecurringTransaction): void => {
    const data = loadData();
    if (!data.recurringTransactions) return;
    const index = data.recurringTransactions.findIndex(r => r.id === updated.id);
    if (index !== -1) {
        data.recurringTransactions[index] = updated;
        saveData(data);
    }
};

export const deleteRecurringTransaction = (id: string): void => {
    const data = loadData();
    if (!data.recurringTransactions) return;
    data.recurringTransactions = data.recurringTransactions.filter(r => r.id !== id);
    saveData(data);
};

export const loadRecurringTransactions = (): RecurringTransaction[] => {
    const data = loadData();
    return data.recurringTransactions || [];
};

export const normalizeCategory = (category: string): string => {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
};

export const findSimilarCategory = (input: string, categories: (string | Category)[]): string | null => {
  const normalized = normalizeCategory(input);
  
  for (const category of categories) {
    const name = typeof category === 'string' ? category : category.name;
    if (normalizeCategory(name) === normalized) {
      return name;
    }
  }
  
  return null;
};

export const getCategorySuggestions = (input: string, categories: (string | Category)[]): string[] => {
  if (!input) return categories.map(c => typeof c === 'string' ? c : c.name);
  const normalized = normalizeCategory(input);
  return (categories.map(c => typeof c === 'string' ? c : c.name)).filter(name => 
    normalizeCategory(name).includes(normalized)
  );
};
