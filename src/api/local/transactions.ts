import { Transaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";

export const getTransactions = async (): Promise<Transaction[]> => {
  const pageSize = 1000;
  let from = 0;
  const allTransactions: Transaction[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    allTransactions.push(...(data as Transaction[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allTransactions;
};

export const addTransaction = async (transaction: Omit<Transaction, "id"> & { id?: string }): Promise<void> => {
  const newTransaction = {
    id: transaction.id || crypto.randomUUID(),
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
