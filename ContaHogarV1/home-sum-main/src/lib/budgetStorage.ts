import { Budget } from '@/types/finance';
import { loadData, saveData } from './storage';

export const loadBudgets = (month: string): Budget[] => {
  const data = loadData();
  return (data.budgets || []).filter(b => b.month === month);
};

export const saveBudget = (budget: Budget): void => {
  const data = loadData();
  if (!data.budgets) data.budgets = [];
  data.budgets.push(budget);
  saveData(data);
};

export const updateBudget = (updated: Budget): void => {
  const data = loadData();
  if (!data.budgets) return;
  const index = data.budgets.findIndex(b => b.id === updated.id);
  if (index !== -1) {
    data.budgets[index] = updated;
    saveData(data);
  }
};

export const deleteBudget = (id: string): void => {
  const data = loadData();
  if (!data.budgets) return;
  data.budgets = data.budgets.filter(b => b.id !== id);
  saveData(data);
};
