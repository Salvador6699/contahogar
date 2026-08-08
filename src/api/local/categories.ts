import { Category } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw new Error(error.message);
  return data as Category[];
};

export const addCategory = async (name: string): Promise<void> => {
  const newCategory = {
    id: uuidv4(),
    name: name.trim(),
    icon: "Tag",
    color: "#94a3b8"
  };
  const { error } = await supabase.from('categories').insert([newCategory]);
  if (error) throw new Error(error.message);
};

export const updateCategory = async (category: Category): Promise<void> => {
  // Get old category to check if name changed
  const { data: oldData, error: fetchError } = await supabase.from('categories').select('name').eq('id', category.id).single();
  if (fetchError) throw new Error(fetchError.message);
  
  const { error } = await supabase.from('categories').update(category).eq('id', category.id);
  if (error) throw new Error(error.message);

  if (oldData && oldData.name !== category.name) {
    const oldName = oldData.name;
    const newName = category.name;
    // Cascade update to transactions, budgets, favorites, savings_goals
    await Promise.all([
      supabase.from('transactions').update({ category: newName }).eq('category', oldName),
      supabase.from('budgets').update({ category: newName }).eq('category', oldName),
      supabase.from('favorites').update({ category: newName }).eq('category', oldName),
      supabase.from('savings_goals').update({ category: newName }).eq('category', oldName),
      supabase.from('recurring_rules').update({ category: newName }).eq('category', oldName)
    ]);
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { data: catData, error: catError } = await supabase.from('categories').select('name').eq('id', id).single();
  if (catError) throw new Error(catError.message);
  
  if (catData) {
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
        throw new Error(`No se puede eliminar la categoría porque está siendo usada en ${check.name}.`);
      }
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
