import { FinanceData, Transaction, Account, Category, RecurringTransaction, FavoriteExpense, SavingsGoal } from '@/types/finance';
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
  favorites: [],
  alertSettings: {
    thresholdOverrides: {},
    dismissedItems: [],
    dismissedTotal: false
  },
  savingsGoals: []
});

export const migrateData = (data: any): FinanceData => {
  if (!data || typeof data !== 'object') {
    return getDefaultData();
  }

  // Ensure recurringTransactions, favorites, and alertSettings exist
  if (data.recurringTransactions === undefined) data.recurringTransactions = [];
  if (data.favorites === undefined) data.favorites = [];
  if (data.budgets === undefined) data.budgets = [];
  if (data.alertSettings === undefined) {
    data.alertSettings = {
      thresholdOverrides: {},
      dismissedItems: [],
      dismissedTotal: false
    };
  } else {
    // Ensure all sub-fields exist in alertSettings
    if (data.alertSettings.thresholdOverrides === undefined) data.alertSettings.thresholdOverrides = {};
    if (data.alertSettings.dismissedItems === undefined) data.alertSettings.dismissedItems = [];
    if (data.alertSettings.dismissedTotal === undefined) data.alertSettings.dismissedTotal = false;
  }
  
  if (data.savingsGoals === undefined) data.savingsGoals = [];

  // If accounts array exists, assume it's new format or already partially migrated
  if (Array.isArray(data.accounts)) {
    return data as FinanceData;
  }

  // Migrating old data format to multi-account structure
  // ... (rest of migrate logic is similar but simplified for brevity in this replace)
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
    alertSettings: data.alertSettings,
    savingsGoals: Array.isArray(data.savingsGoals) ? data.savingsGoals : []
  };
  
  if (Array.isArray(data.transactions)) {
    migratedData.transactions = data.transactions.map((t: any) => ({
      ...t,
      accountId: t.account === 'cash' ? newCash.id : newBank.id,
    }));
  }
  
  return migratedData;
};

// ... (loadData / saveData remain same)

export const updateAlertSettings = (settings: Partial<FinanceData['alertSettings']>): void => {
    const data = loadData();
    data.alertSettings = {
        ...(data.alertSettings || { thresholdOverrides: {}, dismissedItems: [], dismissedTotal: false }),
        ...settings
    };
    saveData(data);
};


// Utility functions for safe base64 encoding/decoding of UTF-8 strings
const encodeBase64 = (str: string) => {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
  } catch (e) {
    return btoa(str);
  }
};

const decodeBase64 = (str: string) => {
  try {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch (e) {
    try {
      return atob(str);
    } catch {
      return str; // Fallback
    }
  }
};

export const loadData = (): FinanceData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaultData = getDefaultData();
      saveData(defaultData);
      return defaultData;
    }
    
    // Try to decode base64, fallback to plain text if it fails (backward compatibility)
    let jsonString = stored;
    if (!stored.startsWith('{') && !stored.startsWith('[')) {
      try {
        jsonString = decodeBase64(stored);
      } catch (e) {
        jsonString = stored;
      }
    }
    
    const data = JSON.parse(jsonString);
    return migrateData(data);
  } catch (error) {
    console.error('Error loading data:', error);
    return getDefaultData();
  }
};

export const saveData = (data: FinanceData): void => {
  try {
    const jsonString = JSON.stringify(data);
    const obfuscated = encodeBase64(jsonString);
    localStorage.setItem(STORAGE_KEY, obfuscated);
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

// --- BACKUP HISTORIAL LOGIC ---
const BACKUPS_KEY = 'contahogar_backups_history';

export interface DataSnapshot {
  id: string;
  date: string;
  name: string;
  data: FinanceData;
  summary: {
    totalAccounts: number;
    totalTransactions: number;
    totalBalance: number;
  };
}

export const getLocalSnapshots = (): DataSnapshot[] => {
  const saved = localStorage.getItem(BACKUPS_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (e) {
    return [];
  }
};

export const saveLocalSnapshot = (data: FinanceData, name: string = 'Copia Automática') => {
  const snapshots = getLocalSnapshots();
  
  // Defensive checks to ensure data is valid
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];

  const totalBalance = accounts.reduce((sum, acc) => {
    // Calculate current balance for this account
    const accTransactions = transactions.filter(t => t.accountId === acc.id && !t.isPending);
    const balance = accTransactions.reduce((accSum, t) => 
      t.type === 'income' ? accSum + t.amount : accSum - t.amount, 
      acc.initialBalance
    );
    return sum + balance;
  }, 0);

  // Use a more compatible ID generation for non-secure contexts (HTTP/Mobile IP)
  const snapshotId = uuidv4();

  const newSnapshot: DataSnapshot = {
    id: snapshotId,
    date: new Date().toISOString(),
    name,
    data,
    summary: {
      totalAccounts: accounts.length,
      totalTransactions: transactions.length,
      totalBalance,
    }
  };

  // Keep only the last 10 snapshots to save space
  const updatedSnapshots = [newSnapshot, ...snapshots].slice(0, 10);
  localStorage.setItem(BACKUPS_KEY, JSON.stringify(updatedSnapshots));
  return updatedSnapshots;
};

export const deleteLocalSnapshot = (id: string) => {
  const snapshots = getLocalSnapshots();
  const updated = snapshots.filter(s => s.id !== id);
  localStorage.setItem(BACKUPS_KEY, JSON.stringify(updated));
  return updated;
};

// Account Management
export const addAccount = (name: string, initialBalance: number, linkedAccountId?: string, logo?: string): Account => {
    const data = loadData();
    const newAccount: Account = {
        id: uuidv4(),
        name,
        initialBalance,
        linkedAccountId,
        logo
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

// Save a transaction preserving its given ID (used for recurring pattern matching)
export const saveTransactionWithId = (transaction: Transaction): void => {
  const data = loadData();
  const existingIdx = data.transactions.findIndex(t => t.id === transaction.id);
  if (existingIdx !== -1) {
    // Overwrite existing (e.g. a pending auto-generated one)
    data.transactions[existingIdx] = transaction;
  } else {
    data.transactions.push(transaction);
  }
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

// Favorite Expense Management
export const addFavorite = (favorite: Omit<FavoriteExpense, 'id'>): FavoriteExpense => {
  const data = loadData();
  const newFavorite: FavoriteExpense = { ...favorite, id: uuidv4() };
  if (!data.favorites) data.favorites = [];
  data.favorites.push(newFavorite);
  saveData(data);
  return newFavorite;
};

export const updateFavorite = (updated: FavoriteExpense): void => {
  const data = loadData();
  if (!data.favorites) return;
  const index = data.favorites.findIndex(f => f.id === updated.id);
  if (index !== -1) {
    data.favorites[index] = updated;
    saveData(data);
  }
};

export const deleteFavorite = (id: string): void => {
  const data = loadData();
  if (!data.favorites) return;
  data.favorites = data.favorites.filter(f => f.id !== id);
  saveData(data);
};

export const loadFavorites = (): FavoriteExpense[] => {
  const data = loadData();
  return data.favorites || [];
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

// Savings Goal Management
export const addSavingsGoal = (goal: Omit<SavingsGoal, 'id'>): SavingsGoal => {
  const data = loadData();
  const newGoal: SavingsGoal = { ...goal, id: uuidv4() };
  if (!data.savingsGoals) data.savingsGoals = [];
  data.savingsGoals.push(newGoal);
  saveData(data);
  return newGoal;
};

export const updateSavingsGoal = (updated: SavingsGoal): void => {
  const data = loadData();
  if (!data.savingsGoals) return;
  const index = data.savingsGoals.findIndex(g => g.id === updated.id);
  if (index !== -1) {
    data.savingsGoals[index] = updated;
    saveData(data);
  }
};

export const deleteSavingsGoal = (id: string): void => {
  const data = loadData();
  if (!data.savingsGoals) return;
  data.savingsGoals = data.savingsGoals.filter(g => g.id !== id);
  saveData(data);
};

export const loadSavingsGoals = (): SavingsGoal[] => {
  const data = loadData();
  return data.savingsGoals || [];
};
