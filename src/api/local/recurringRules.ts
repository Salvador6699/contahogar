import { RecurringExpenseRule } from "@/types/finance";
import { supabase } from "@/lib/supabase";


export const getRecurringRules = async (): Promise<RecurringExpenseRule[]> => {
  const { data, error } = await supabase.from('recurring_rules').select('*');
  if (error) throw new Error(error.message);
  return data as RecurringExpenseRule[];
};

export const addRecurringRule = async (rule: Omit<RecurringExpenseRule, "id">): Promise<RecurringExpenseRule> => {
  const newRule = {
    id: crypto.randomUUID(),
    ...rule
  };
  const { data, error } = await supabase.from('recurring_rules').insert([newRule]).select().single();
  if (error) throw new Error(error.message);
  return data as RecurringExpenseRule;
};

export const updateRecurringRule = async (rule: RecurringExpenseRule): Promise<void> => {
  const { error } = await supabase.from('recurring_rules').update(rule).eq('id', rule.id);
  if (error) throw new Error(error.message);
};

export const deleteRecurringRule = async (id: string): Promise<void> => {
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
