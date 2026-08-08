// Let's just copy the sync logic here
import { createClient } from '@supabase/supabase-js';
import { addMonths, addYears, addDays, addWeeks, isAfter, parseISO, format } from 'date-fns';

const SUPABASE_URL = "https://cylcgjnctklbmybagxtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_z4dyZBWFi7q24hy3lSH8eQ_JsvMC97m";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSync() {
  const [{ data: rules }, { data: transactions }, { data: loans }] = await Promise.all([
    supabase.from('recurring_rules').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('loans').select('*')
  ]);

  const today = new Date();
  const activeRuleIds = new Set(rules.map((r) => r.id));
  const idsToDelete = new Set();
  const transactionsToUpsert = [];

  transactions.forEach((t) => {
    if (t.isPending && t.id.startsWith("rec_")) {
      const parts = t.id.split("_");
      if (parts.length >= 3) {
        const ruleId = parts[1];
        if (!activeRuleIds.has(ruleId)) {
          idsToDelete.add(t.id);
        }
      }
    }
  });

  rules.forEach((rule) => {
    let limitDate = new Date();
    if (rule.frequency === "weekly" || rule.frequency === "Semanal") {
      limitDate = addMonths(today, 6);
    } else if (rule.frequency === "yearly" || rule.frequency === "Anual") {
      limitDate = addYears(today, 2);
    } else if (rule.frequency === "custom") {
      limitDate = addYears(today, 2);
    } else {
      limitDate = addYears(today, 1);
    }

    let currentDate = parseISO(rule.startDate);
    if (isNaN(currentDate.getTime())) currentDate = new Date();

    const generatedIds = new Set();
    let iterations = 0;
    const MAX_ITERATIONS = 500;

    while (!isAfter(currentDate, limitDate) && iterations < MAX_ITERATIONS) {
      iterations++;
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const txId = `rec_${rule.id}_${dateStr}`;
      generatedIds.add(txId);

      const existingTxIndex = transactions.findIndex((t) => t.id === txId);

      if (existingTxIndex !== -1) {
        const existingTx = transactions[existingTxIndex];
        if (existingTx.isPending) {
          transactionsToUpsert.push({
            ...existingTx,
            amount: rule.amount,
            category: rule.category,
            accountId: rule.accountId,
            type: rule.type,
            description: rule.name,
            date: dateStr,
          });
        }
      } else {
        const matchingLoan = loans?.find(l => 
          l.type === "fractionation" && 
          l.originalTransactionData && 
          (l.originalTransactionData.id === txId || 
            (l.originalTransactionData.date === dateStr && l.originalTransactionData.amount === rule.amount && l.originalTransactionData.description === rule.name)
          )
        );

        if (matchingLoan) {
          transactionsToUpsert.push({
            id: txId,
            date: dateStr,
            amount: 0,
            category: rule.category,
            accountId: rule.accountId,
            type: rule.type,
            description: rule.name + ' (Fraccionado)',
            isPending: false,
            isIgnored: true,
            linkedLoanId: matchingLoan.id
          });
        } else {
          transactionsToUpsert.push({
            id: txId,
            date: dateStr,
            amount: rule.amount,
            category: rule.category,
            accountId: rule.accountId,
            type: rule.type,
            description: rule.name,
            isPending: true,
          });
        }
      }

      if (rule.frequency === "weekly") {
        currentDate = addWeeks(currentDate, 1);
      } else if (rule.frequency === "yearly") {
        currentDate = addYears(currentDate, 1);
      } else if (rule.frequency === "custom") {
        const interval = rule.customInterval || 1;
        if (rule.customIntervalUnit === "days") {
          currentDate = addDays(currentDate, interval);
        } else if (rule.customIntervalUnit === "years") {
          currentDate = addYears(currentDate, interval);
        } else {
          currentDate = addMonths(currentDate, interval);
        }
      } else {
        currentDate = addMonths(currentDate, 1);
      }
    }

    transactions.forEach((t) => {
      if (t.isPending && t.id.startsWith(`rec_${rule.id}_`)) {
        if (!generatedIds.has(t.id)) {
          idsToDelete.add(t.id);
        }
      }
    });
  });

  console.log("Upserting:", transactionsToUpsert.length, "Deleting:", idsToDelete.size);

  if (idsToDelete.size > 0) {
    const ids = Array.from(idsToDelete);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await supabase.from('transactions').delete().in('id', chunk);
      if (error) console.error("Error deleting:", error);
    }
  }

  if (transactionsToUpsert.length > 0) {
    for (let i = 0; i < transactionsToUpsert.length; i += 100) {
      const chunk = transactionsToUpsert.slice(i, i + 100);
      const { error } = await supabase.from('transactions').upsert(chunk);
      if (error) console.error("Error upserting chunk:", error);
    }
  }
}

testSync();
