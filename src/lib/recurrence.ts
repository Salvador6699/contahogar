import {
  Transaction,
  RecurringExpenseRule,
  Loan,
} from "@/types/finance";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  parseISO,
  format,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { getTransactions } from "@/api/local/transactions";
import { getRecurringRules } from "@/api/local/recurringRules";
import { getLoans } from "@/api/local/loans";

/**
 * Synchronizes the generated pending transactions with the recurring rules in Supabase.
 * This should be called on startup, and whenever rules are modified.
 */
export const syncRecurringTransactionsToSupabase = async (): Promise<void> => {
  const [rules, transactions, loans] = await Promise.all([
    getRecurringRules(),
    getTransactions(),
    getLoans()
  ]);

  const today = new Date();

  // 1. Identify all rules
  const activeRuleIds = new Set(rules.map((r) => r.id));

  // 2. Identify orphaned pending transactions (from deleted rules) to delete
  const idsToDelete = new Set<string>();
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

  const transactionsToUpsert: Transaction[] = [];

  // 3. For each rule, regenerate pending transactions
  rules.forEach((rule) => {
    let limitDate = new Date();
    if (rule.frequency === "weekly") {
      limitDate = addMonths(today, 6);
    } else if (rule.frequency === "yearly") {
      limitDate = addYears(today, 2);
    } else if (rule.frequency === "custom") {
      limitDate = addYears(today, 2);
    } else {
      limitDate = addYears(today, 1);
    }

    let currentDate = parseISO(rule.startDate);
    if (isNaN(currentDate.getTime())) {
      currentDate = new Date();
    }
    const generatedIds = new Set<string>();

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
        // Only update if it's still pending AND has NOT been fractionated (linkedLoanId means it's been split)
        if (existingTx.isPending && !existingTx.linkedLoanId) {
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
        // If it has linkedLoanId or isPending=false, leave it untouched
      } else {
        // Create new pending transaction
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

    // Clean up old pending transactions for THIS rule that are no longer in the generated set
    transactions.forEach((t) => {
      if (t.isPending && t.id.startsWith(`rec_${rule.id}_`)) {
        if (!generatedIds.has(t.id)) {
          idsToDelete.add(t.id);
        }
      }
    });
  });

  if (idsToDelete.size > 0) {
    const ids = Array.from(idsToDelete);
    // Chunking deletes if there are too many, though Supabase can handle a lot
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      await supabase.from('transactions').delete().in('id', chunk);
    }
  }

  if (transactionsToUpsert.length > 0) {
    for (let i = 0; i < transactionsToUpsert.length; i += 100) {
      const chunk = transactionsToUpsert.slice(i, i + 100);
      await supabase.from('transactions').upsert(chunk);
    }
  }
};
