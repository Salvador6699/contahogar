import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSept() {
  const { data, error } = await supabase.from('transactions').select('*');
  if (error) {
    console.error("Error:", error);
    return;
  }
  const septPending = data.filter(t => t.isPending && t.date.startsWith('2026-09'));
  console.log("Total Sept pending:", septPending.length);
  console.log("Ignored:", septPending.filter(t => t.isIgnored).length);
  console.log("Not ignored:", septPending.filter(t => !t.isIgnored).length);
  if (septPending.filter(t => !t.isIgnored).length > 0) {
    console.log("Some not ignored are:", septPending.filter(t => !t.isIgnored));
  }
}
checkSept();
