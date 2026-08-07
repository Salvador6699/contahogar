import { Budget, SavingsGoal } from "@/types/finance";
import * as storage from "@/lib/storage";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

// Budgets
export const getBudgets = async (): Promise<Budget[]> => {
  await delay();
  return storage.loadData().budgets || [];
};

// Goals
export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  await delay();
  return storage.loadSavingsGoals();
};

export const addSavingsGoal = async (goal: Omit<SavingsGoal, "id">): Promise<SavingsGoal> => {
  await delay();
  return storage.addSavingsGoal(goal);
};

export const updateSavingsGoal = async (goal: SavingsGoal): Promise<void> => {
  await delay();
  storage.updateSavingsGoal(goal);
};

export const deleteSavingsGoal = async (id: string): Promise<void> => {
  await delay();
  storage.deleteSavingsGoal(id);
};
