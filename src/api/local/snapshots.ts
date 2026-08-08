import { supabase } from '@/lib/supabase';
import { FinanceData } from '@/types/finance';

export interface CloudSnapshot {
  id: string;
  created_at: string;
  data: FinanceData;
}

export interface CloudSnapshotSummary {
  id: string;
  created_at: string;
}

export const getSnapshots = async (): Promise<CloudSnapshotSummary[]> => {
  const { data, error } = await supabase
    .from('cloud_snapshots')
    .select('id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching snapshots:', error);
    throw error;
  }
  return data || [];
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
  // Sustituir la copia de hoy si ya existe (mantener 1 por día)
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

  // Enforce max 100 snapshots
  try {
    const all = await getSnapshots();
    if (all.length > 100) {
      const toDelete = all.slice(100);
      const idsToDelete = toDelete.map(s => s.id);
      await supabase.from('cloud_snapshots').delete().in('id', idsToDelete);
    }
  } catch (cleanupError) {
    console.error('Error cleaning up old snapshots:', cleanupError);
  }

  return data;
};

export const getFullCloudData = async (): Promise<FinanceData> => {
  const responses = await Promise.all([
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('budgets').select('*'),
    supabase.from('favorites').select('*'),
    supabase.from('savings_goals').select('*'),
    supabase.from('recurring_rules').select('*'),
    supabase.from('loans').select('*'),
  ]);

  const errorResponse = responses.find(r => r.error);
  if (errorResponse) {
    console.error('Error fetching cloud data for snapshot:', errorResponse.error);
    throw new Error('Fallo al obtener datos de la nube para el backup.');
  }

  const [
    { data: accounts },
    { data: categories },
    { data: transactions },
    { data: budgets },
    { data: favorites },
    { data: savingsGoals },
    { data: recurringRules },
    { data: loans },
  ] = responses;

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
