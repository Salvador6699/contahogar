import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSync() {
  const { data: rules, error: err1 } = await supabase.from('recurring_rules').select('*');
  if (err1) { console.error("Error fetching rules:", err1); return; }
  console.log("Rules found:", rules.length);

  const { data: transactions, error: err2 } = await supabase.from('transactions').select('*');
  if (err2) { console.error("Error fetching txs:", err2); return; }
  console.log("Total txs found:", transactions.length);

  if (rules.length === 0) return;

  const dummyTx = {
    id: 'test_sync_tx_123',
    date: '2026-09-01',
    amount: 10,
    category: 'Test',
    type: 'expense',
    accountId: rules[0]?.accountId || 'default-bank-id',
    description: 'Test Sync',
    isPending: true
  };

  const { error: err3 } = await supabase.from('transactions').upsert([dummyTx]);
  if (err3) {
    console.error("Error upserting:", err3);
  } else {
    console.log("Upsert successful!");
    await supabase.from('transactions').delete().eq('id', 'test_sync_tx_123');
  }
}

testSync();
