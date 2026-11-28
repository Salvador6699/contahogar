import { Category, CategoryKind, CategoryNature } from "@/types/finance";
import { supabase } from "@/lib/supabase";

export interface AddCategoryInput {
  name: string;
  color?: string;
  icon?: string;
  customIcon?: string;
  parentId?: string | null;
  isGroup?: boolean;
  kind?: CategoryKind | null;
  nature?: CategoryNature | null;
  isArchived?: boolean;
}

const isMissingHierarchyColumnError = (message: string) =>
  /column .* (parentId|isGroup|kind|nature|isArchived)/i.test(message) ||
  /Could not find the '(parentId|isGroup|kind|nature|isArchived)' column/i.test(message);

const MIGRATION_HINT =
  "Faltan las columnas de jerarquía en Supabase. Ejecuta primero el archivo supabase/categories_hierarchy_migration.sql en el SQL Editor de Supabase.";

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data as Category[]).map((c) => ({
    ...c,
    name: c.name.trim(),
  }));
};

export const addCategory = async (
  input: string | AddCategoryInput
): Promise<Category> => {
  const isString = typeof input === "string";
  const trimmedName = (isString ? input : input.name).trim();
  if (!trimmedName) {
    throw new Error("El nombre de la categoría es obligatorio.");
  }

  const baseCategory: Category = {
    id: crypto.randomUUID(),
    name: trimmedName,
    icon: (!isString && input.icon) ? input.icon : "Tag",
    color: (!isString && input.color) ? input.color : "#94a3b8",
    ...(!isString && input.customIcon ? { customIcon: input.customIcon } : {}),
  };

  const hasHierarchyFields =
    !isString &&
    (input.parentId !== undefined ||
      input.isGroup !== undefined ||
      input.kind !== undefined ||
      input.nature !== undefined ||
      input.isArchived !== undefined);

  const payload: Category = {
    ...baseCategory,
    ...(hasHierarchyFields
      ? {
          parentId: input.isGroup ? null : (input.parentId ?? null),
          isGroup: Boolean(input.isGroup),
          kind: input.kind ?? null,
          nature: input.kind === "expense" || !input.kind ? (input.nature ?? null) : null,
          isArchived: Boolean(input.isArchived),
        }
      : {}),
  };

  const { data, error } = await supabase.from('categories').insert([payload]).select().single();
  if (error) {
    if (isMissingHierarchyColumnError(error.message)) {
      if (!hasHierarchyFields) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('categories')
          .insert([baseCategory])
          .select()
          .single();
        if (fallbackError) throw new Error(fallbackError.message);
        return fallbackData as Category;
      }
      throw new Error(MIGRATION_HINT);
    }
    throw new Error(error.message);
  }
  return data as Category;
};

export const updateCategory = async (category: Category): Promise<void> => {
  const trimmedName = category.name.trim();
  if (!trimmedName) {
    throw new Error("El nombre de la categoría es obligatorio.");
  }

  // Get old category to check if name changed
  const { data: oldData, error: fetchError } = await supabase
    .from('categories')
    .select('name')
    .eq('id', category.id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const cleanCategory: Category = {
    ...category,
    name: trimmedName,
    parentId: category.isGroup ? null : (category.parentId ?? null),
    nature: category.kind && category.kind !== 'expense' ? null : (category.nature ?? null),
  };

  const { error } = await supabase.from('categories').update(cleanCategory).eq('id', category.id);
  if (error) {
    if (isMissingHierarchyColumnError(error.message)) {
      throw new Error(MIGRATION_HINT);
    }
    throw new Error(error.message);
  }

  if (oldData && oldData.name !== trimmedName) {
    const oldName = oldData.name;
    // Cascade update to transactions, budgets, favorites, savings_goals, recurring_rules
    await Promise.all([
      supabase.from('transactions').update({ category: trimmedName }).eq('category', oldName),
      supabase.from('budgets').update({ category: trimmedName }).eq('category', oldName),
      supabase.from('favorites').update({ category: trimmedName }).eq('category', oldName),
      supabase.from('savings_goals').update({ category: trimmedName }).eq('category', oldName),
      supabase.from('recurring_rules').update({ category: trimmedName }).eq('category', oldName),
    ]);
  }
};

export const mergeCategories = async (
  sourceId: string,
  targetId: string
): Promise<{ sourceName: string; targetName: string }> => {
  if (sourceId === targetId) {
    throw new Error("No puedes fusionar una categoría consigo misma.");
  }

  const { data: pair, error: fetchError } = await supabase
    .from('categories')
    .select('*')
    .in('id', [sourceId, targetId]);
  if (fetchError) throw new Error(fetchError.message);

  const source = (pair as Category[] | null)?.find((c) => c.id === sourceId);
  const target = (pair as Category[] | null)?.find((c) => c.id === targetId);

  if (!source || !target) {
    throw new Error("No se encontraron las categorías seleccionadas para fusionar.");
  }
  if (source.isGroup || target.isGroup) {
    throw new Error("Solo se pueden fusionar subcategorías/categorías, no grupos padre.");
  }

  const sourceRawName = source.name;
  const sourceTrimmed = source.name.trim();
  const targetTrimmed = target.name.trim();
  const sourceVariants = Array.from(new Set([sourceRawName, sourceTrimmed]));

  // 1. Reasignar presupuestos combinando importes si ambas categorías tienen sobre en el mismo mes
  const { data: allBudgets, error: budFetchErr } = await supabase
    .from('budgets')
    .select('*')
    .in('category', [...sourceVariants, target.name, targetTrimmed]);
  if (budFetchErr) throw new Error(budFetchErr.message);

  if (allBudgets && allBudgets.length > 0) {
    const targetByMonth = new Map<string, any>();
    const sourceBudgets: any[] = [];
    for (const b of allBudgets) {
      if (sourceVariants.includes(b.category)) {
        sourceBudgets.push(b);
      } else {
        targetByMonth.set(b.month, b);
      }
    }

    for (const sb of sourceBudgets) {
      const existingTarget = targetByMonth.get(sb.month);
      if (existingTarget) {
        const mergedAmount = Number((Number(existingTarget.amount) + Number(sb.amount)).toFixed(2));
        await supabase.from('budgets').update({ amount: mergedAmount, category: targetTrimmed }).eq('id', existingTarget.id);
        await supabase.from('budgets').delete().eq('id', sb.id);
      } else {
        await supabase.from('budgets').update({ category: targetTrimmed }).eq('id', sb.id);
      }
    }
  }

  // 2. Reasignar el resto de tablas (exacta y trimmed)
  await Promise.all([
    supabase.from('transactions').update({ category: targetTrimmed }).in('category', sourceVariants),
    supabase.from('favorites').update({ category: targetTrimmed }).in('category', sourceVariants),
    supabase.from('savings_goals').update({ category: targetTrimmed }).in('category', sourceVariants),
    supabase.from('recurring_rules').update({ category: targetTrimmed }).in('category', sourceVariants),
  ]);

  // 3. Eliminar categoría origen
  const { error: delError } = await supabase.from('categories').delete().eq('id', sourceId);
  if (delError) throw new Error(delError.message);

  return { sourceName: sourceTrimmed, targetName: targetTrimmed };
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, name, isGroup')
    .eq('id', id)
    .single();
  if (catError) throw new Error(catError.message);

  if (catData) {
    // Si es un grupo, verificar que no tenga subcategorías asignadas
    if ((catData as any).isGroup) {
      const { data: children, error: childErr } = await supabase
        .from('categories')
        .select('id')
        .eq('parentId', id)
        .limit(1);
      if (!childErr && children && children.length > 0) {
        throw new Error("No se puede eliminar el grupo porque tiene subcategorías asignadas. Mueve o elimina las subcategorías primero.");
      }
    }

    const checks = [
      { table: 'transactions', name: 'transacciones' },
      { table: 'budgets', name: 'presupuestos' },
      { table: 'recurring_rules', name: 'gastos fijos/recurrentes' },
      { table: 'savings_goals', name: 'metas de ahorro' },
      { table: 'favorites', name: 'botones rápidos (gastos rápidos)' }
    ];

    for (const check of checks) {
      const { data, error } = await supabase.from(check.table).select('id').eq('category', catData.name).limit(1);
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        throw new Error(`No se puede eliminar la categoría porque está siendo usada en ${check.name}. Puedes fusionarla en otra o archivarla.`);
      }
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
