import { Category } from "@/types/finance";
import * as storage from "@/lib/storage";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const getCategories = async (): Promise<Category[]> => {
  await delay();
  return storage.getCategories();
};

export const addCategory = async (name: string): Promise<void> => {
  await delay();
  storage.addCategory(name);
};

export const updateCategory = async (category: Category): Promise<void> => {
  await delay();
  storage.updateCategory(category);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await delay();
  const res = storage.deleteCategory(id);
  if (!res.success) {
    throw new Error(res.message);
  }
};
