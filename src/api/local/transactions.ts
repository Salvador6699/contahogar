import { Transaction } from "@/types/finance";
import * as storage from "@/lib/storage";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTransactions = async (): Promise<Transaction[]> => {
  await delay();
  return storage.loadData().transactions;
};

export const addTransaction = async (transaction: Omit<Transaction, "id">): Promise<void> => {
  await delay();
  storage.addTransaction(transaction);
};

export const updateTransaction = async (transaction: Transaction): Promise<void> => {
  await delay();
  storage.updateTransaction(transaction);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await delay();
  storage.deleteTransaction(id);
};
