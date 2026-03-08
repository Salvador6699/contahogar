export type TransactionType = 'income' | 'expense';
export type AccountType = 'bank' | 'cash';
export type AccountView = AccountType | 'total';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
  account: AccountType; // 'bank' or 'cash'
  isPending?: boolean; // true for future/pending transactions
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

export interface FinanceData {
  initialBankBalance: number;
  initialCashBalance: number;
  transactions: Transaction[];
  categories: string[];
  budgets?: Budget[];
}
