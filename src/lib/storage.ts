// src/lib/storage.ts
import { FinanceData, Transaction, Account } from '@/types/finance';
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

const getDefaultData = (): FinanceData => ({
  accounts: [defaultBank, defaultCash],
  transactions: [],
  categories: ['Sueldo', 'Comida', 'Transporte', 'Ocio', 'Hogar'],
  budgets: [],
});

const migrateData = (data: any): FinanceData => {
  if (!data || typeof data !== 'object') {
    return getDefaultData();
  }

  // If accounts array exists, assume it's new format or already migrated
  if (Array.isArray(data.accounts)) {
    // Ensure budgets is not optional
    if (data.budgets === undefined) {
      data.budgets = [];
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
    categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : getDefaultData().categories,
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
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
  
  // Clean up undefined fields from final transaction objects
  migratedData.transactions.forEach(t => {
      if (t.account === undefined) {
          delete t.account;
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
export const addCategory = (category: string): void => {
  const data = loadData();
  const normalized = normalizeCategory(category);
  
  const exists = data.categories.some(
    cat => normalizeCategory(cat) === normalized
  );
  
  if (!exists && category.trim().length > 0) {
    data.categories.push(category.trim());
    data.categories.sort((a, b) => a.localeCompare(b)); // Keep it sorted
    saveData(data);
  }
};

export const normalizeCategory = (category: string): string => {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
};

export const findSimilarCategory = (input: string, categories: string[]): string | null => {
  const normalized = normalizeCategory(input);
  
  for (const category of categories) {
    if (normalizeCategory(category) === normalized) {
      return category;
    }
  }
  
  return null;
};

export const getCategorySuggestions = (input: string, categories: string[]): string[] => {
  if (!input) return categories;
  const normalized = normalizeCategory(input);
  return categories.filter(category => 
    normalizeCategory(category).includes(normalized)
  );
};
