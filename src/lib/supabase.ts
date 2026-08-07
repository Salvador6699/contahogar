import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las variables de entorno de Supabase. Revisa tu archivo .env');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export const uploadToSupabase = async (data: any): Promise<void> => {
  const upsertData = async (table: string, payload: any[]) => {
    if (!payload || payload.length === 0) return;
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      console.error(`Error al subir a ${table}:`, error);
      throw new Error(`Error en tabla ${table}: ${error.message}`);
    }
  };

  const validAccountIds = new Set((data.accounts || []).map((a: any) => a.id));
  const defaultAccountId = data.accounts && data.accounts.length > 0 ? data.accounts[0].id : null;
  const safeAccountId = (id: any) => validAccountIds.has(id) ? id : defaultAccountId;

  const safeAccounts = (data.accounts || []).map((a: any) => ({ id: a.id, name: a.name, initialBalance: a.initialBalance, linkedAccountId: a.linkedAccountId, logo: a.logo, excludeFromTotals: a.excludeFromTotals }));
  const safeCategories = (data.categories || []).map((c: any) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, monthlyLimit: c.monthlyLimit, customIcon: c.customIcon }));
  const safeTransactions = (data.transactions || []).map((t: any) => ({ id: t.id, date: t.date, amount: t.amount, category: t.category, type: t.type === 'income' ? 'income' : 'expense', accountId: safeAccountId(t.accountId), description: t.description, isPending: t.isPending || false, isIgnored: t.isIgnored || false, linkedLoanId: t.linkedLoanId })).filter((t: any) => t.accountId != null);
  const safeBudgets = (data.budgets || []).map((b: any) => ({ id: b.id, category: b.category, amount: b.amount, month: b.month, isAuto: b.isAuto || false }));
  const safeFavorites = (data.favorites || []).map((f: any) => ({ id: f.id, name: f.name, amount: f.amount, category: f.category, accountId: safeAccountId(f.accountId), description: f.description, type: f.type === 'income' ? 'income' : 'expense', icon: f.icon, customIcon: f.customIcon })).filter((f: any) => f.accountId != null);
  const safeSavingsGoals = (data.savingsGoals || []).map((sg: any) => ({ id: sg.id, name: sg.name, targetAmount: sg.targetAmount, currentAmount: sg.currentAmount, deadline: sg.deadline, accountId: safeAccountId(sg.accountId), color: sg.color, category: sg.category, priority: sg.priority, isIgnored: sg.isIgnored || false })).filter((sg: any) => sg.accountId != null);
  
  const parseFreq = (f: string) => {
    if (f === 'Semanal') return 'weekly';
    if (f === 'Anual') return 'yearly';
    if (f === 'custom') return 'custom';
    return 'monthly';
  };
  const safeRecurringRules = (data.recurringRules || []).map((r: any) => ({ id: r.id, name: r.name, amount: r.amount, category: r.category, accountId: safeAccountId(r.accountId), frequency: parseFreq(r.frequency), customInterval: r.customInterval, customIntervalUnit: r.customIntervalUnit, startDate: r.startDate, type: r.type === 'income' ? 'income' : 'expense', savingsPriority: r.savingsPriority })).filter((r: any) => r.accountId != null);
  
  const safeLoans = (data.loans || []).map((l: any) => ({ id: l.id, name: l.name, type: l.type === 'fractionation' ? 'fractionation' : 'loan', amount: l.amount, installments: l.installments, installmentAmount: l.installmentAmount, setupFee: l.setupFee || 0, startDate: l.startDate, accountId: safeAccountId(l.accountId), status: l.status === 'completed' ? 'completed' : 'active', isStarted: l.isStarted || false, startingPaidAmount: l.startingPaidAmount || 0, originalTransactionData: l.originalTransactionData })).filter((l: any) => l.accountId != null);

  await upsertData('accounts', safeAccounts);
  await upsertData('categories', safeCategories);
  await upsertData('transactions', safeTransactions);
  await upsertData('budgets', safeBudgets);
  await upsertData('favorites', safeFavorites);
  await upsertData('savings_goals', safeSavingsGoals);
  await upsertData('recurring_rules', safeRecurringRules);
  await upsertData('loans', safeLoans);
};
