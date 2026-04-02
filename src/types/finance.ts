export type TransactionType = 'income' | 'expense';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// New Account interface for flexible account management
export interface Account {
  id: string;
  name: string;
  initialBalance: number;
}

export interface Transaction {
  id:string;
  date: string; // "yyyy-mm-dd"
  amount: number;
  category: string;
  type: TransactionType;
  accountId: string; // Link to the Account's id
  description?: string;
  isPending?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  monthlyLimit?: number;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  lastGeneratedDate?: string;
  isActive: boolean;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string; // yyyy-MM
}

// Updated FinanceData to support multiple accounts, structured categories and automations
export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringTransactions?: RecurringTransaction[];
}
