import { Transaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

const getTeamId = () => {
  const teamId = localStorage.getItem('contahogar_active_team_id');
  if (!teamId) throw new Error("No hay equipo activo");
  return teamId;
};


export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, user_profiles(full_name, email)').eq('team_id', getTeamId())
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Transaction[];
};

export const addTransaction = async (transaction: Omit<Transaction, "id">): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  const newTransaction = {
    id: uuidv4(), team_id: getTeamId(), user_id: user?.id,
    ...transaction
  };
  const { error } = await supabase.from('transactions').insert([newTransaction]);
  if (error) throw new Error(error.message);
};

export const updateTransaction = async (transaction: Partial<Transaction> & { id: string }): Promise<void> => {
  const { error } = await supabase.from('transactions').update(transaction).eq('id', transaction.id);
  if (error) throw new Error(error.message);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
