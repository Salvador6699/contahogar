import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkIncomes() {
  const { data } = await supabase.from('transactions').select('*');
  const septIncomes = data.filter(t => t.isPending && t.date.startsWith('2026-09') && t.type === 'income');
  const septExpenses = data.filter(t => t.isPending && t.date.startsWith('2026-09') && t.type === 'expense');
  
  const totalIncome = septIncomes.reduce((s, t) => s + (!t.isIgnored ? t.amount : 0), 0);
  const totalExpense = septExpenses.reduce((s, t) => s + (!t.isIgnored ? t.amount : 0), 0);
  
  console.log("Total Pending Income (not ignored):", totalIncome);
  console.log("Total Pending Expense (not ignored):", totalExpense);
  console.log("Net Impact:", totalIncome - totalExpense);
}
checkIncomes();
