export type TransactionType = 'income' | 'expense';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'every_n_months' | 'yearly';

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
  customIcon?: string; // Data URL for custom uploaded icon
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  intervalMonths?: number;   // used when frequency === 'every_n_months'
  endAfterMonths?: number;   // undefined = indefinido; N = termina después de N meses
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

export interface FavoriteExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  accountId: string;
  description?: string;
  type: TransactionType;
  icon?: string;
  customIcon?: string;
}

export interface AlertSettings {
  thresholdOverrides: Record<string, number>;
  dismissedItems: string[];
  dismissedTotal: boolean;
}

// Updated FinanceData to support multiple accounts, structured categories and automations
export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringTransactions?: RecurringTransaction[];
  favorites?: FavoriteExpense[];
  alertSettings?: AlertSettings;
}
