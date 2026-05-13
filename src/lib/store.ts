import { create } from 'zustand';
import { FinanceData, Transaction } from '@/types/finance';
import { loadData, saveData } from './storage';

interface FinanceStore {
  data: FinanceData;
  setData: (data: FinanceData) => void;
  refreshData: () => void;
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  data: loadData(),
  setData: (newData) => {
    saveData(newData);
    set({ data: newData });
  },
  refreshData: () => {
    set({ data: loadData() });
  }
}));
