import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Account,
  Budget,
  RecurringExpenseRule,
  SavingsGoal,
  Transaction,
} from '../../src/types/finance.js';

export interface PushSubscriptionRow {
  id: string;
  device_id: string;
  app: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}

export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY env variables.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchAllTransactions(supabase: SupabaseClient): Promise<Transaction[]> {
  const pageSize = 1000;
  let from = 0;
  const all: Transaction[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Error reading transactions: ${error.message}`);
    if (!data || data.length === 0) break;

    all.push(...(data as Transaction[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export async function fetchNotificationSnapshot(supabase: SupabaseClient): Promise<{
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringRules: RecurringExpenseRule[];
  subscriptions: PushSubscriptionRow[];
}> {
  const [accountsRes, transactions, budgetsRes, goalsRes, rulesRes, subsRes] =
    await Promise.all([
      supabase.from('accounts').select('*'),
      fetchAllTransactions(supabase),
      supabase.from('budgets').select('*'),
      supabase.from('savings_goals').select('*'),
      supabase.from('recurring_rules').select('*'),
      supabase.from('push_subscriptions').select('*').eq('app', 'contahogar'),
    ]);

  if (accountsRes.error) throw new Error(`Error reading accounts: ${accountsRes.error.message}`);
  if (budgetsRes.error) throw new Error(`Error reading budgets: ${budgetsRes.error.message}`);
  if (goalsRes.error) throw new Error(`Error reading savings_goals: ${goalsRes.error.message}`);
  if (rulesRes.error) throw new Error(`Error reading recurring_rules: ${rulesRes.error.message}`);
  if (subsRes.error) throw new Error(`Error reading push_subscriptions: ${subsRes.error.message}`);

  return {
    accounts: (accountsRes.data || []) as Account[],
    transactions,
    budgets: (budgetsRes.data || []) as Budget[],
    savingsGoals: (goalsRes.data || []) as SavingsGoal[],
    recurringRules: (rulesRes.data || []) as RecurringExpenseRule[],
    subscriptions: (subsRes.data || []) as PushSubscriptionRow[],
  };
}
