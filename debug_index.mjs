import { createClient } from '@supabase/supabase-js';
import { parseISO, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function calculateCategorySummaries(transactions, type, accountId, onlyPending) {
  const categoryMap = new Map();
  transactions
    .filter(t => {
      let match = t.type === type;
      if (onlyPending) {
        match = match && t.isPending;
      } else {
        match = match && !t.isPending;
      }
      if (accountId) {
        match = match && t.accountId === accountId;
      }
      return match;
    })
    .forEach(transaction => {
      const existing = categoryMap.get(transaction.category);
      if (existing) {
        existing.total += transaction.amount;
        existing.count += 1;
      } else {
        categoryMap.set(transaction.category, {
          category: transaction.category,
          total: transaction.amount,
          count: 1,
        });
      }
    });
  return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
}

async function debugIndex() {
  const { data: transactions } = await supabase.from('transactions').select('*');
  
  const selectedMonth = '2026-09';
  const monthKey = selectedMonth;
  const monthStart = startOfMonth(parseISO(monthKey + '-01'));
  const monthEnd = endOfMonth(monthStart);

  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = parseISO(transaction.date);
    return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
  });

  const nonTransferTransactions = filteredTransactions.filter(
    (t) => t.category !== "Transferencia"
  );

  const accountFilter = undefined;

  const pendingExpenseCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "expense",
    accountFilter,
    true
  );

  console.log("Filtered transactions total:", filteredTransactions.length);
  console.log("Non transfer:", nonTransferTransactions.length);
  console.log("Pending Expense Categories:", pendingExpenseCategories.length);
  console.log("Categories:", pendingExpenseCategories);
}

debugIndex();
