import { FavoriteExpense } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const getFavorites = async (): Promise<FavoriteExpense[]> => {
  const { data, error } = await supabase.from('favorites').select('*');
  if (error) throw new Error(error.message);
  return data as FavoriteExpense[];
};

export const addFavorite = async (favorite: Omit<FavoriteExpense, "id">): Promise<FavoriteExpense> => {
  const newFavorite = {
    id: uuidv4(),
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
