import { FavoriteExpense } from "@/types/finance";
import { supabase } from "@/lib/supabase";


export const getFavorites = async (): Promise<FavoriteExpense[]> => {
  const { data, error } = await supabase.from('favorites').select('*');
  if (error) throw new Error(error.message);
  return data as FavoriteExpense[];
};

export const addFavorite = async (favorite: Omit<FavoriteExpense, "id">): Promise<FavoriteExpense> => {
  const newFavorite = {
    id: crypto.randomUUID(),
    ...favorite
  };
  const { data, error } = await supabase.from('favorites').insert([newFavorite]).select().single();
  if (error) throw new Error(error.message);
  return data as FavoriteExpense;
};

export const updateFavorite = async (favorite: FavoriteExpense): Promise<void> => {
  const { error } = await supabase.from('favorites').update(favorite).eq('id', favorite.id);
  if (error) throw new Error(error.message);
};

export const deleteFavorite = async (id: string): Promise<void> => {
  const { error } = await supabase.from('favorites').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
