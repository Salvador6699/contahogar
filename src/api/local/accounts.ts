import { Account } from "@/types/finance";
import * as storage from "@/lib/storage";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const getAccounts = async (): Promise<Account[]> => {
  await delay();
  return storage.loadData().accounts;
};

export const addAccount = async (data: {
  name: string;
  initialBalance: number;
  linkedAccountId?: string;
  logo?: string;
  excludeFromTotals?: boolean;
}): Promise<Account> => {
  await delay();
  return storage.addAccount(
    data.name,
    data.initialBalance,
    data.linkedAccountId,
    data.logo,
    data.excludeFromTotals
  );
};

export const updateAccount = async (account: Account): Promise<void> => {
  await delay();
  storage.updateAccount(account);
};

export const deleteAccount = async (id: string): Promise<void> => {
  await delay();
  const res = storage.deleteAccount(id);
  if (!res.success) {
    throw new Error(res.message);
  }
};
