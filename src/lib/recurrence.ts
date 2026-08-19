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

    // Helper: find a fractionation loan that covers this rule+date
    const findMatchingFractionLoan = (txId: string, dateStr: string) => {
      return loans?.find(l => {
        if (l.type !== 'fractionation') return false;
        const od = l.originalTransactionData;
        if (!od) return false;
        // Direct match by txId stored in originalTransactionData
        if (od.id && od.id === txId) return true;
        // Match by date + amount + description (old backup format has no id)
        if (od.date === dateStr && od.amount === rule.amount && od.description === rule.name) return true;
        // Range match: loan covers this date and name matches (future cuotas)
        try {
          const loanStart = parseISO(l.startDate);
          const loanEnd = addMonths(loanStart, (l.installments || 1) - 1);
          const cur = parseISO(dateStr);
          if (l.name === rule.name && !isBefore(cur, loanStart) && !isAfter(cur, loanEnd)) return true;
        } catch (_) { /* ignore parse errors */ }
        return false;
      });
    };

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
        // Leave alone if: already confirmed, already linked to a loan, or now covered by a fractionation loan
        if (!existingTx.isPending || existingTx.linkedLoanId) {
          // leave untouched
        } else {
          const { user_profiles, ...cleanExistingTx } = existingTx as any;
          const matchingLoan = findMatchingFractionLoan(txId, dateStr);
          if (matchingLoan) {
            // Mark as fractionated retroactively (e.g. old backup without linkedLoanId)
            transactionsToUpsert.push({
              ...cleanExistingTx,
              amount: 0,
              isPending: false,
              isIgnored: true,
              linkedLoanId: matchingLoan.id,
              description: rule.name + ' (Fraccionado)',
            });
          } else {
            transactionsToUpsert.push({
              ...cleanExistingTx,
              amount: rule.amount,
              category: rule.category,
              accountId: rule.accountId,
              type: rule.type,
              description: rule.name,
              date: dateStr,
            });
          }
        }
      } else {
        // Create new pending transaction
        const matchingLoan = findMatchingFractionLoan(txId, dateStr);

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
            linkedLoanId: matchingLoan.id,
            team_id: (rule as any).team_id
          } as any);
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
            team_id: (rule as any).team_id
          } as any);
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
      const { error } = await supabase.from('transactions').upsert(chunk);
      if (error) {
        console.error("Error upserting recurring transactions:", error);
      }
    }
  }
};
