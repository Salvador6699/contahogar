import { Budget, SavingsGoal } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// Budgets
export const getBudgets = async (): Promise<Budget[]> => {
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw new Error(error.message);
  return data as Budget[];
};

export const saveBudgetsForMonth = async (month: string, budgets: Budget[]): Promise<void> => {
  // 1. Delete all budgets for the given month
  const { error: deleteError } = await supabase.from('budgets').delete().eq('month', month);
  if (deleteError) throw new Error(deleteError.message);

  // 2. Insert new budgets
  if (budgets.length > 0) {
    const { error: insertError } = await supabase.from('budgets').insert(budgets);
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
    id: uuidv4(),
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
