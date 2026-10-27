import { supabase } from '@/lib/supabase';
import { FinanceData } from '@/types/finance';
import { getTransactions } from './transactions';

export interface CloudSnapshot {
  id: string;
  created_at: string;
  data: FinanceData;
}

export interface CloudSnapshotSummary {
  id: string;
  created_at: string;
  skipped?: boolean;
}

const MAX_SNAPSHOTS = 10;

const normalizeCollection = <T extends { id?: string }>(items: T[] = []): string => {
  const sorted = [...items].sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
  const canonical = sorted.map(item => {
    const clean: Record<string, unknown> = {};
    Object.keys(item as Record<string, unknown>)
      .filter(k => k !== 'created_at' && k !== 'createdAt' && k !== 'updated_at')
      .sort()
      .forEach(k => {
        const val = (item as Record<string, unknown>)[k];
        if (val !== undefined && val !== null) {
          clean[k] = val;
        }
      });
    return clean;
  });
  return JSON.stringify(canonical);
};

export const isFinanceDataIdentical = (a?: FinanceData | null, b?: FinanceData | null): boolean => {
  if (!a || !b) return false;
  return (
    normalizeCollection(a.accounts) === normalizeCollection(b.accounts) &&
    normalizeCollection(a.transactions) === normalizeCollection(b.transactions) &&
    normalizeCollection(a.categories) === normalizeCollection(b.categories) &&
    normalizeCollection(a.budgets) === normalizeCollection(b.budgets) &&
    normalizeCollection(a.favorites) === normalizeCollection(b.favorites) &&
    normalizeCollection(a.savingsGoals) === normalizeCollection(b.savingsGoals) &&
    normalizeCollection(a.recurringRules) === normalizeCollection(b.recurringRules) &&
    normalizeCollection(a.loans) === normalizeCollection(b.loans)
  );
};

export const getSnapshots = async (): Promise<CloudSnapshotSummary[]> => {
  const { data, error } = await supabase
    .from('cloud_snapshots')
    .select('id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching snapshots:', error);
    throw error;
  }

  const all = data || [];
  if (all.length > MAX_SNAPSHOTS) {
    const toDelete = all.slice(MAX_SNAPSHOTS);
    const idsToDelete = toDelete.map(s => s.id);
    supabase
      .from('cloud_snapshots')
      .delete()
      .in('id', idsToDelete)
      .then(({ error: delError }) => {
        if (delError) console.error('Error cleaning up old snapshots:', delError);
      });
    return all.slice(0, MAX_SNAPSHOTS);
  }

  return all;
};

export const getSnapshotData = async (id: string): Promise<FinanceData> => {
  const { data, error } = await supabase
    .from('cloud_snapshots')
    .select('data')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching snapshot data:', error);
    throw error;
  }
  return data?.data as FinanceData;
};

export const createSnapshot = async (financeData: FinanceData): Promise<CloudSnapshotSummary> => {
  // Comprobar si los datos son idénticos a la última copia guardada para evitar copias duplicadas
  try {
    const existingSnapshots = await getSnapshots();
    if (existingSnapshots.length > 0) {
      const latest = existingSnapshots[0];
      const latestData = await getSnapshotData(latest.id);
      if (isFinanceDataIdentical(financeData, latestData)) {
        return { ...latest, skipped: true };
      }
    }
  } catch (e) {
    console.error('Error comparando con la última copia:', e);
  }

  // Sustituir la copia de hoy si ya existe (mantener máx. 1 por día)
  const todayString = new Date().toISOString().split('T')[0];
  try {
    const { data: todaySnapshots } = await supabase
      .from('cloud_snapshots')
      .select('id')
      .gte('created_at', `${todayString}T00:00:00Z`);
    
    if (todaySnapshots && todaySnapshots.length > 0) {
      const idsToDelete = todaySnapshots.map(s => s.id);
      await supabase.from('cloud_snapshots').delete().in('id', idsToDelete);
    }
  } catch (e) {
    console.error('Error limpiando copias de hoy:', e);
  }

  const { data, error } = await supabase
    .from('cloud_snapshots')
    .insert([{ data: financeData }])
    .select('id, created_at')
    .single();

  if (error) {
    console.error('Error creating snapshot:', error);
    throw error;
  }

  // Mantener como máximo las últimas 10 copias
  try {
    await getSnapshots();
  } catch (cleanupError) {
    console.error('Error cleaning up old snapshots:', cleanupError);
  }

  return data;
};

export const getFullCloudData = async (): Promise<FinanceData> => {
  const [
    transactions,
    accountsRes,
    categoriesRes,
    budgetsRes,
    favoritesRes,
    savingsGoalsRes,
    recurringRulesRes,
    loansRes,
  ] = await Promise.all([
    getTransactions(),
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('budgets').select('*'),
    supabase.from('favorites').select('*'),
    supabase.from('savings_goals').select('*'),
    supabase.from('recurring_rules').select('*'),
    supabase.from('loans').select('*'),
  ]);

  const errorResponse = [accountsRes, categoriesRes, budgetsRes, favoritesRes, savingsGoalsRes, recurringRulesRes, loansRes].find(r => r.error);
  if (errorResponse) {
    console.error('Error fetching cloud data for snapshot:', errorResponse.error);
    throw new Error('Fallo al obtener datos de la nube para el backup.');
  }

  const { data: accounts } = accountsRes;
  const { data: categories } = categoriesRes;
  const { data: budgets } = budgetsRes;
  const { data: favorites } = favoritesRes;
  const { data: savingsGoals } = savingsGoalsRes;
  const { data: recurringRules } = recurringRulesRes;
  const { data: loans } = loansRes;

  return {
    accounts: (accounts || []).map(a => ({ ...a, initialBalance: Number(a.initialBalance) })),
    categories: categories || [],
    transactions: (transactions || []).map(t => ({ ...t, amount: Number(t.amount) })),
    budgets: (budgets || []).map(b => ({ ...b, amount: Number(b.amount) })),
    favorites: (favorites || []).map(f => ({ ...f, amount: Number(f.amount) })),
    savingsGoals: (savingsGoals || []).map(sg => ({ ...sg, targetAmount: Number(sg.targetAmount), currentAmount: Number(sg.currentAmount) })),
    recurringRules: (recurringRules || []).map(r => ({ ...r, amount: Number(r.amount) })),
    loans: (loans || []).map(l => ({ ...l, amount: Number(l.amount), installmentAmount: Number(l.installmentAmount), setupFee: Number(l.setupFee), startingPaidAmount: Number(l.startingPaidAmount) })),
    alertSettings: {
      thresholdOverrides: {},
      dismissedItems: [],
      dismissedTotal: false
    }
  } as FinanceData;
};

export const createSnapshotFromCloud = async (): Promise<CloudSnapshotSummary> => {
  const currentData = await getFullCloudData();
  return createSnapshot(currentData);
};
