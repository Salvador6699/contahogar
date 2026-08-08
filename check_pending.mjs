import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPending() {
  const { data, error } = await supabase.from('transactions').select('*').eq('isPending', true);
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Pending transactions in DB:", data.length);
  const byMonth = {};
  data.forEach(t => {
    const m = t.date.substring(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  });
  console.log("By month:", byMonth);
}
checkPending();
