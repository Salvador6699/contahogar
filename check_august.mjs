import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAugust() {
  const { data } = await supabase.from('transactions').select('*');
  const augExpenses = data.filter(t => t.isPending && t.date.startsWith('2026-08') && t.type === 'expense');
  
  const totalExpense = augExpenses.reduce((s, t) => s + (!t.isIgnored ? t.amount : 0), 0);
  
  console.log("Total Pending Expense Aug (not ignored):", totalExpense);
}
checkAugust();
