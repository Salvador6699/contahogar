import { RecurringExpenseRule } from "@/types/finance";
import { supabase } from "@/lib/supabase";


const LOCAL_STORAGE_SAVINGS_FLAG_KEY = "recurring_rules_include_savings";

const getLocalSavingsMap = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SAVINGS_FLAG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLocalSavingsFlag = (id: string, include: boolean | undefined) => {
  try {
    const map = getLocalSavingsMap();
    if (include === undefined) {
      delete map[id];
    } else {
      map[id] = include;
    }
    localStorage.setItem(LOCAL_STORAGE_SAVINGS_FLAG_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const removeLocalSavingsFlag = (id: string) => {
  try {
    const map = getLocalSavingsMap();
    delete map[id];
    localStorage.setItem(LOCAL_STORAGE_SAVINGS_FLAG_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const getRecurringRules = async (): Promise<RecurringExpenseRule[]> => {
  const { data, error } = await supabase.from('recurring_rules').select('*');
  if (error) throw new Error(error.message);
  
  const localMap = getLocalSavingsMap();
  return (data as RecurringExpenseRule[]).map(rule => {
    const localVal = localMap[rule.id];
    return {
      ...rule,
      includeInSavings: rule.includeInSavings !== undefined ? rule.includeInSavings : localVal,
    };
  });
};

export const addRecurringRule = async (rule: Omit<RecurringExpenseRule, "id">): Promise<RecurringExpenseRule> => {
  const newRule = {
    id: crypto.randomUUID(),
    ...rule
  };
  
  if (newRule.includeInSavings !== undefined) {
    setLocalSavingsFlag(newRule.id, newRule.includeInSavings);
  }

  const { data, error } = await supabase.from('recurring_rules').insert([newRule]).select().single();
  if (error) {
    if (error.message.includes('includeInSavings') || error.message.includes('column')) {
      const { includeInSavings, ...fallbackRule } = newRule;
      const { data: fbData, error: fbError } = await supabase.from('recurring_rules').insert([fallbackRule]).select().single();
      if (fbError) throw new Error(fbError.message);
      return { ...fbData, includeInSavings } as RecurringExpenseRule;
    }
    throw new Error(error.message);
  }
  return data as RecurringExpenseRule;
};

export const updateRecurringRule = async (rule: RecurringExpenseRule): Promise<void> => {
  if (rule.includeInSavings !== undefined) {
    setLocalSavingsFlag(rule.id, rule.includeInSavings);
  }

  const { error } = await supabase.from('recurring_rules').update(rule).eq('id', rule.id);
  if (error) {
    if (error.message.includes('includeInSavings') || error.message.includes('column')) {
      const { includeInSavings, ...fallbackRule } = rule;
      const { error: fbError } = await supabase.from('recurring_rules').update(fallbackRule).eq('id', rule.id);
      if (fbError) throw new Error(fbError.message);
      return;
    }
    throw new Error(error.message);
  }
};

export const deleteRecurringRule = async (id: string): Promise<void> => {
  removeLocalSavingsFlag(id);
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
