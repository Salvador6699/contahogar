import { Transaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";

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
    id: crypto.randomUUID(),
    ...transaction
  };
  const { error } = await supabase.from('transactions').insert([newTransaction]);
  if (error) throw new Error(error.message);
};

export const updateTransaction = async (transaction: Partial<Transaction> & { id: string }): Promise<void> => {
  const updateData = transaction;
  if (transaction.id.startsWith('rec_') || transaction.id.startsWith('loan_')) {
    const { error } = await supabase.from('transactions').upsert([updateData]);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('transactions').update(updateData).eq('id', transaction.id);
    if (error) throw new Error(error.message);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
