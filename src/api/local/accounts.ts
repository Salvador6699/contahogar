import { Account } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const getAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase.from('accounts').select('*');
  if (error) throw new Error(error.message);
  return data as Account[];
};

export const addAccount = async (data: {
  name: string;
  initialBalance: number;
  linkedAccountId?: string;
  logo?: string;
  excludeFromTotals?: boolean;
}): Promise<Account> => {
  const newAccount = {
    id: uuidv4(),
    ...data
  };
  const { data: result, error } = await supabase.from('accounts').insert([newAccount]).select().single();
  if (error) throw new Error(error.message);
  return result as Account;
};

export const updateAccount = async (account: Account): Promise<void> => {
  const { error } = await supabase.from('accounts').update(account).eq('id', account.id);
  if (error) throw new Error(error.message);
};

export const deleteAccount = async (id: string): Promise<void> => {
  // First, check if it has transactions
  const { data: tx, error: txError } = await supabase.from('transactions').select('id').eq('accountId', id).limit(1);
  if (txError) throw new Error(txError.message);
  if (tx && tx.length > 0) {
    throw new Error("No se puede eliminar una cuenta con transacciones asociadas.");
  }
  
  // Also ensure it's not the last account
  const { data: countData, error: countError } = await supabase.from('accounts').select('id', { count: 'exact' });
  if (countError) throw new Error(countError.message);
  if (countData && countData.length <= 1) {
    throw new Error("No puedes eliminar la única cuenta que queda.");
  }

  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
