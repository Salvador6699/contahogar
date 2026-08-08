import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFavorites() {
  const { data, error } = await supabase.from('favorites').select('*');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Favorites in DB:", data.length);
    console.log(data);
  }
}
checkFavorites();
