export type TransactionType = 'income' | 'expense';

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

// Updated FinanceData to support multiple accounts
export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  categories: string[];
  budgets: Budget[];
}
