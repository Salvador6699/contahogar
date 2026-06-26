import {
  FinanceData,
  Transaction,
  RecurringExpenseRule,
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
import { saveData } from "./storage";

/**
 * Synchronizes the generated pending transactions with the recurring rules.
 * This should be called on startup, and whenever rules are modified.
 */
export const syncRecurringTransactions = (data: FinanceData): FinanceData => {
  const rules = data.recurringRules || [];
  let transactions = [...data.transactions];
  const today = new Date();

  // 1. Identify all rules
  const activeRuleIds = new Set(rules.map((r) => r.id));

  // 2. Clean up orphaned pending transactions (from deleted rules)
  transactions = transactions.filter((t) => {
    if (t.isPending && t.id.startsWith("rec_")) {
      const parts = t.id.split("_");
      if (parts.length >= 3) {
        const ruleId = parts[1];
        if (!activeRuleIds.has(ruleId)) {
          return false; // Remove pending tx for a deleted rule
        }
      }
    }
    return true;
  });

  // 3. For each rule, regenerate pending transactions
  rules.forEach((rule) => {
    // Determine the projection limit based on frequency
    let limitDate = new Date();
    if (rule.frequency === "weekly" || rule.frequency === "Semanal" as any) {
      limitDate = addMonths(today, 6);
    } else if (rule.frequency === "yearly" || rule.frequency === "Anual" as any) {
      limitDate = addYears(today, 2);
    } else if (rule.frequency === "custom") {
      limitDate = addYears(today, 2);
    } else {
      limitDate = addYears(today, 1);
    }

    let currentDate = parseISO(rule.startDate);
    if (isNaN(currentDate.getTime())) {
      // If startDate is invalid (e.g. '0000-00-00'), use today as fallback
      currentDate = new Date();
    }
    const generatedIds = new Set<string>();

    // Safeguard to prevent infinite loops
    let iterations = 0;
    const MAX_ITERATIONS = 500;

    // Generate dates until we pass the limitDate
    while (!isAfter(currentDate, limitDate) && iterations < MAX_ITERATIONS) {
      iterations++;
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const txId = `rec_${rule.id}_${dateStr}`;
      generatedIds.add(txId);

      const existingTxIndex = transactions.findIndex((t) => t.id === txId);

      if (existingTxIndex !== -1) {
        const existingTx = transactions[existingTxIndex];
        // Only update if it's still pending
        if (existingTx.isPending) {
          transactions[existingTxIndex] = {
            ...existingTx,
            amount: rule.amount,
            category: rule.category,
            accountId: rule.accountId,
            type: rule.type,
            // name might have changed
            description: rule.name,
            date: dateStr,
          };
        }
      } else {
        // Create new pending transaction
        const newTx: Transaction = {
          id: txId,
          date: dateStr,
          amount: rule.amount,
          category: rule.category,
          accountId: rule.accountId,
          type: rule.type,
          description: rule.name,
          isPending: true,
        };
        transactions.push(newTx);
      }

      // Advance date (support older translated frequencies like 'Mensual')
      if (rule.frequency === "weekly" || rule.frequency === "Semanal" as any) {
        currentDate = addWeeks(currentDate, 1);
      } else if (rule.frequency === "yearly" || rule.frequency === "Anual" as any) {
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
        // Default to monthly for "monthly", "Mensual", or any unknown frequency
        currentDate = addMonths(currentDate, 1);
      }
    }

    // Clean up old pending transactions for THIS rule that are no longer in the generated set
    // (e.g. if the user changed the frequency or startDate)
    transactions = transactions.filter((t) => {
      if (t.isPending && t.id.startsWith(`rec_${rule.id}_`)) {
        if (!generatedIds.has(t.id)) {
          return false; // Remove it
        }
      }
      return true;
    });
  });

  const updatedData = { ...data, transactions };
  return updatedData;
};

/**
 * Convenience function to sync and save directly.
 */
export const syncAndSaveRecurringTransactions = (data: FinanceData): void => {
  const updatedData = syncRecurringTransactions(data);
  saveData(updatedData);
};
