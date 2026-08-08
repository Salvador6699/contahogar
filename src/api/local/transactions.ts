import { Transaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Transaction[];
};

export const addTransaction = async (transaction: Omit<Transaction, "id">): Promise<void> => {
  const newTransaction = {
    id: uuidv4(),
    ...transaction
  };
  const { error } = await supabase.from('transactions').insert([newTransaction]);
  if (error) throw new Error(error.message);
};

export const updateTransaction = async (transaction: Transaction): Promise<void> => {
  const { error } = await supabase.from('transactions').update(transaction).eq('id', transaction.id);
  if (error) throw new Error(error.message);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
