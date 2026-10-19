import { Budget, SavingsGoal } from "@/types/finance";
import { supabase } from "@/lib/supabase";



// Helper to normalize category key per month
const getBudgetKey = (month: string, category: string) =>
  `${month.trim()}::${category.trim().toLowerCase()}`;

const deduplicateBudgets = (items: Budget[]): Budget[] => {
  const map = new Map<string, Budget>();
  for (const item of items) {
    if (!item.month || !item.category) continue;
    const key = getBudgetKey(item.month, item.category);
    const existing = map.get(key);
    // Prefer manual envelopes (!isAuto) over auto envelopes if duplicates exist
    if (!existing || (existing.isAuto && !item.isAuto)) {
      map.set(key, {
        ...item,
        category: item.category.trim(),
      });
    }
  }
  return Array.from(map.values());
};

// Budgets
export const getBudgets = async (): Promise<Budget[]> => {
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw new Error(error.message);
  return deduplicateBudgets((data || []) as Budget[]);
};

export const saveBudgetsForMonth = async (month: string, budgets: Budget[]): Promise<void> => {
  const cleanBudgets = deduplicateBudgets(budgets).map((b) => ({
    ...b,
    id: `b_${month.trim()}_${b.category.trim().toLowerCase().replace(/\s+/g, '_')}`,
    month: month.trim(),
    category: b.category.trim(),
  }));

  // 1. Delete all budgets for the given month
  const { error: deleteError } = await supabase.from('budgets').delete().eq('month', month);
  if (deleteError) throw new Error(deleteError.message);

  // 2. Upsert deduplicated budgets with deterministic IDs to prevent race-condition duplicates
  if (cleanBudgets.length > 0) {
    const { error: insertError } = await supabase
      .from('budgets')
      .upsert(cleanBudgets, { onConflict: 'id' });
    if (insertError) throw new Error(insertError.message);
  }
};

// Goals
export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const { data, error } = await supabase.from('savings_goals').select('*');
  if (error) throw new Error(error.message);
  return data as SavingsGoal[];
};

export const addSavingsGoal = async (goal: Omit<SavingsGoal, "id">): Promise<SavingsGoal> => {
  const newGoal = {
    id: crypto.randomUUID(),
    ...goal
  };
  const { data, error } = await supabase.from('savings_goals').insert([newGoal]).select().single();
  if (error) throw new Error(error.message);
  return data as SavingsGoal;
};

export const updateSavingsGoal = async (goal: SavingsGoal): Promise<void> => {
  const { error } = await supabase.from('savings_goals').update(goal).eq('id', goal.id);
  if (error) throw new Error(error.message);
};

export const deleteSavingsGoal = async (id: string): Promise<void> => {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
