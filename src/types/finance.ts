export type TransactionType = "income" | "expense";

// New Account interface for flexible account management
export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  linkedAccountId?: string;
  logo?: string;
}

export interface Transaction {
  id: string;
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


export interface CategorySummary {
  category: string;
  total: number;
  count: number;
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

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // yyyy-MM-dd
  accountId?: string; // Optional: Link to a specific account
  color?: string;
  category?: string; // e.g. "Viajes", "Vivienda"
}

// Updated FinanceData to support multiple accounts, structured categories and automations
export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string; // yyyy-MM
  createdAt?: string; // ISO string
  isAuto?: boolean;
}

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export interface RecurringExpenseRule {
  id: string;
  name: string;
  amount: number;
  category: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDate: string; // yyyy-MM-dd
  type: TransactionType;
}

export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  favorites?: FavoriteExpense[];
  alertSettings?: AlertSettings;
  savingsGoals?: SavingsGoal[];
  recurringRules?: RecurringExpenseRule[];
}
