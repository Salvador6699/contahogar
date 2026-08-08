import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSnapshots() {
  const { data, error } = await supabase.from('cloud_snapshots').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Found ${data.length} snapshots`);
    if (data.length > 0) {
      console.log("Latest snapshot:", data[0].created_at);
      console.log("Payload keys:", Object.keys(data[0].payload));
      console.log("Accounts count:", data[0].payload.accounts?.length);
      console.log("Transactions count:", data[0].payload.transactions?.length);
    }
  }
}
checkSnapshots();
