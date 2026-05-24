import { Budget } from '@/types/finance';
import { loadData, saveData } from './storage';
import { v4 as uuidv4 } from 'uuid';

export const loadBudgets = (): Budget[] => {
  const data = loadData();
  return data.budgets || [];
};

export const saveBudget = (budget: Omit<Budget, 'id'> | Budget): Budget => {
  const data = loadData();
  let updatedBudget: Budget;
  
  if ('id' in budget && budget.id) {
    const index = data.budgets.findIndex(b => b.id === budget.id);
    if (index !== -1) {
      updatedBudget = budget as Budget;
      data.budgets[index] = updatedBudget;
    } else {
      updatedBudget = { ...budget, id: uuidv4() } as Budget;
      data.budgets.push(updatedBudget);
    }
  } else {
    updatedBudget = { ...budget, id: uuidv4() } as Budget;
    data.budgets.push(updatedBudget);
  }
  
  saveData(data);
  return updatedBudget;
};

export const updateBudgetsBatch = (budgets: Budget[]): void => {
  const data = loadData();
  
  // Replace or add budgets based on their IDs
  budgets.forEach(b => {
    const idx = data.budgets.findIndex(existing => existing.id === b.id);
    if (idx !== -1) {
      data.budgets[idx] = b;
    } else {
      data.budgets.push(b);
    }
  });
  
  saveData(data);
};

export const deleteBudget = (id: string): void => {
  const data = loadData();
  data.budgets = data.budgets.filter(b => b.id !== id);
  saveData(data);
};
