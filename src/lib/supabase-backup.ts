import { supabase } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any

const parseFreq = (f: string) => {
  if (f === 'Semanal' || f === 'weekly') return 'weekly'
  if (f === 'Anual' || f === 'yearly') return 'yearly'
  if (f === 'custom') return 'custom'
  return 'monthly'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSafePayloads(data: AnyData) {
  const validAccountIds = new Set((data.accounts || []).map((a: AnyData) => a.id))
  const efectivo = (data.accounts || []).find((a: AnyData) => a.name?.toLowerCase() === 'efectivo')
  const defaultAccountId = efectivo?.id ?? (data.accounts?.[0]?.id ?? null)
  const safeId = (id: AnyData) => (validAccountIds.has(id) ? id : defaultAccountId)

  return {
    validAccountIds,
    safeAccounts: (data.accounts || []).map((a: AnyData) => ({ id: a.id, name: a.name, initialBalance: a.initialBalance, linkedAccountId: a.linkedAccountId, logo: a.logo, excludeFromTotals: a.excludeFromTotals })),
    safeCategories: (data.categories || []).map((c: AnyData) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, monthlyLimit: c.monthlyLimit, customIcon: c.customIcon })),
    safeTransactions: (data.transactions || []).filter((t: AnyData) => validAccountIds.has(t.accountId)).map((t: AnyData) => ({ id: t.id, date: t.date, amount: t.amount, category: t.category, type: t.type === 'income' ? 'income' : 'expense', accountId: t.accountId, description: t.description, isPending: t.isPending || false, isIgnored: t.isIgnored || false, linkedLoanId: t.linkedLoanId })),
    safeBudgets: (data.budgets || []).map((b: AnyData) => ({ id: b.id, category: b.category, amount: b.amount, month: b.month, isAuto: b.isAuto || false })),
    safeFavorites: (data.favorites || []).map((f: AnyData) => ({ id: f.id, name: f.name, amount: f.amount, category: f.category, accountId: safeId(f.accountId), description: f.description, type: f.type === 'income' ? 'income' : 'expense', icon: f.icon, customIcon: f.customIcon })).filter((f: AnyData) => f.accountId != null),
    safeSavingsGoals: (data.savingsGoals || []).map((sg: AnyData) => ({ id: sg.id, name: sg.name, targetAmount: sg.targetAmount, currentAmount: sg.currentAmount, deadline: sg.deadline, accountId: safeId(sg.accountId), color: sg.color, category: sg.category, priority: sg.priority, isIgnored: sg.isIgnored || false })).filter((sg: AnyData) => sg.accountId != null),
    safeRecurringRules: (data.recurringRules || []).map((r: AnyData) => ({ id: r.id, name: r.name, amount: r.amount, category: r.category, accountId: safeId(r.accountId), frequency: parseFreq(r.frequency), customInterval: r.customInterval, customIntervalUnit: r.customIntervalUnit, startDate: r.startDate, type: r.type === 'income' ? 'income' : 'expense', savingsPriority: r.savingsPriority })).filter((r: AnyData) => r.accountId != null),
    safeLoans: (data.loans || []).map((l: AnyData) => ({ id: l.id, name: l.name, type: l.type === 'fractionation' ? 'fractionation' : 'loan', amount: l.amount, installments: l.installments, installmentAmount: l.installmentAmount, setupFee: l.setupFee || 0, startDate: l.startDate, accountId: safeId(l.accountId), status: l.status === 'completed' ? 'completed' : 'active', isStarted: l.isStarted || false, startingPaidAmount: l.startingPaidAmount || 0, originalTransactionData: l.originalTransactionData })).filter((l: AnyData) => l.accountId != null),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const restoreToSupabase = async (data: AnyData): Promise<void> => {
  if (!data?.accounts?.length) {
    throw new Error('El backup no contiene cuentas. Restauración abortada por seguridad para prevenir la pérdida de datos.')
  }

  const wipe = async (table: string) => {
    const { error } = await supabase.from(table).delete().neq('id', 'dummy')
    if (error) throw new Error(`Error limpiando tabla ${table}: ${error.message}`)
  }

  await wipe('transactions')
  await wipe('favorites')
  await wipe('savings_goals')
  await wipe('recurring_rules')
  await wipe('loans')
  await wipe('budgets')
  await wipe('categories')
  await wipe('accounts')

  const insert = async (table: string, payload: AnyData[]) => {
    if (!payload?.length) return
    const { error } = await supabase.from(table).insert(payload)
    if (error) throw new Error(`Error insertando en tabla ${table}: ${error.message}`)
  }

  const p = buildSafePayloads(data)
  await insert('accounts', p.safeAccounts)
  await insert('categories', p.safeCategories)
  await insert('transactions', p.safeTransactions)
  await insert('budgets', p.safeBudgets)
  await insert('favorites', p.safeFavorites)
  await insert('savings_goals', p.safeSavingsGoals)
  await insert('recurring_rules', p.safeRecurringRules)
  await insert('loans', p.safeLoans)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadToSupabase = async (data: AnyData): Promise<void> => {
  const upsert = async (table: string, payload: AnyData[]) => {
    if (!payload?.length) return
    const { error } = await supabase.from(table).upsert(payload)
    if (error) throw new Error(`Error en tabla ${table}: ${error.message}`)
  }

  const p = buildSafePayloads(data)
  await upsert('accounts', p.safeAccounts)
  await upsert('categories', p.safeCategories)
  await upsert('transactions', p.safeTransactions)
  await upsert('budgets', p.safeBudgets)
  await upsert('favorites', p.safeFavorites)
  await upsert('savings_goals', p.safeSavingsGoals)
  await upsert('recurring_rules', p.safeRecurringRules)
  await upsert('loans', p.safeLoans)
}
