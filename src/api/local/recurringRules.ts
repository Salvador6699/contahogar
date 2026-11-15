import { RecurringExpenseKind, RecurringExpenseRule } from "@/types/finance";
import { supabase } from "@/lib/supabase";

const LOCAL_STORAGE_SAVINGS_FLAG_KEY = "recurring_rules_include_savings";
const LOCAL_STORAGE_KIND_MAP_KEY = "recurring_rules_kind_map";

const readLocalMap = <T>(storageKey: string): Record<string, T> => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
};

const writeLocalMapEntry = <T>(storageKey: string, id: string, value: T | undefined) => {
  try {
    const map = readLocalMap<T>(storageKey);
    if (value === undefined) {
      delete map[id];
    } else {
      map[id] = value;
    }
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const isMissingOptionalColumnError = (message: string): boolean =>
  message.includes('includeInSavings') ||
  message.includes('kind') ||
  message.includes('column');

export const getRecurringRules = async (): Promise<RecurringExpenseRule[]> => {
  const { data, error } = await supabase.from('recurring_rules').select('*');
  if (error) throw new Error(error.message);

  const localSavingsMap = readLocalMap<boolean>(LOCAL_STORAGE_SAVINGS_FLAG_KEY);
  const localKindMap = readLocalMap<RecurringExpenseKind>(LOCAL_STORAGE_KIND_MAP_KEY);
  return (data as RecurringExpenseRule[]).map((rule) => ({
    ...rule,
    includeInSavings:
      rule.includeInSavings !== undefined ? rule.includeInSavings : localSavingsMap[rule.id],
    kind: rule.kind ?? localKindMap[rule.id],
  }));
};

export const addRecurringRule = async (rule: Omit<RecurringExpenseRule, "id">): Promise<RecurringExpenseRule> => {
  const newRule: RecurringExpenseRule = {
    id: crypto.randomUUID(),
    ...rule,
  };

  if (newRule.includeInSavings !== undefined) {
    writeLocalMapEntry(LOCAL_STORAGE_SAVINGS_FLAG_KEY, newRule.id, newRule.includeInSavings);
  }
  if (newRule.kind !== undefined) {
    writeLocalMapEntry(LOCAL_STORAGE_KIND_MAP_KEY, newRule.id, newRule.kind);
  }

  const { data, error } = await supabase.from('recurring_rules').insert([newRule]).select().single();
  if (error) {
    if (isMissingOptionalColumnError(error.message)) {
      const { kind: _kind, ...withoutKind } = newRule;
      const retry = await supabase.from('recurring_rules').insert([withoutKind]).select().single();
      if (!retry.error) {
        return {
          ...retry.data,
          includeInSavings: newRule.includeInSavings ?? retry.data.includeInSavings,
          kind: newRule.kind,
        } as RecurringExpenseRule;
      }
      if (isMissingOptionalColumnError(retry.error.message)) {
        const { includeInSavings: _inc, kind: _k, ...fallbackRule } = newRule;
        const { data: fbData, error: fbError } = await supabase
          .from('recurring_rules')
          .insert([fallbackRule])
          .select()
          .single();
        if (fbError) throw new Error(fbError.message);
        return {
          ...fbData,
          includeInSavings: newRule.includeInSavings,
          kind: newRule.kind,
        } as RecurringExpenseRule;
      }
      throw new Error(retry.error.message);
    }
    throw new Error(error.message);
  }
  return {
    ...data,
    includeInSavings: data.includeInSavings ?? newRule.includeInSavings,
    kind: data.kind ?? newRule.kind,
  } as RecurringExpenseRule;
};

export const updateRecurringRule = async (rule: RecurringExpenseRule): Promise<void> => {
  writeLocalMapEntry(LOCAL_STORAGE_SAVINGS_FLAG_KEY, rule.id, rule.includeInSavings);
  writeLocalMapEntry(LOCAL_STORAGE_KIND_MAP_KEY, rule.id, rule.kind);

  const { error } = await supabase.from('recurring_rules').update(rule).eq('id', rule.id);
  if (error) {
    if (isMissingOptionalColumnError(error.message)) {
      const { kind: _kind, ...withoutKind } = rule;
      const retry = await supabase.from('recurring_rules').update(withoutKind).eq('id', rule.id);
      if (!retry.error) return;
      if (isMissingOptionalColumnError(retry.error.message)) {
        const { includeInSavings: _inc, kind: _k, ...fallbackRule } = rule;
        const { error: fbError } = await supabase
          .from('recurring_rules')
          .update(fallbackRule)
          .eq('id', rule.id);
        if (fbError) throw new Error(fbError.message);
        return;
      }
      throw new Error(retry.error.message);
    }
    throw new Error(error.message);
  }
};

export const deleteRecurringRule = async (id: string): Promise<void> => {
  writeLocalMapEntry<boolean>(LOCAL_STORAGE_SAVINGS_FLAG_KEY, id, undefined);
  writeLocalMapEntry<RecurringExpenseKind>(LOCAL_STORAGE_KIND_MAP_KEY, id, undefined);
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
