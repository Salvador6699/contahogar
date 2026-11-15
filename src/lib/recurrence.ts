import {
  Transaction,
  RecurringExpenseRule,
  Loan,
  MortgageMetadata,
} from "@/types/finance";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  getDaysInMonth,
  isBefore,
  isAfter,
  parseISO,
  format,
  setDate,
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

  // 1. Identify all rules and autonomous mortgages
  const activeRuleIds = new Set(rules.map((r) => r.id));
  const activeAutonomousMortgages = (loans || []).filter((loan) => {
    const meta = loan.originalTransactionData as MortgageMetadata | undefined;
    if (loan.type !== "loan" || !meta?.isMortgage) return false;
    // Si todavía existe una regla vinculada activa en Gastos Fijos, esa regla genera los pendientes para no duplicar
    if (meta.linkedRuleId && activeRuleIds.has(meta.linkedRuleId)) return false;
    if (loan.status === "completed") return false;
    if (loan.installmentAmount <= 0) return false;
    if (loan.amount > 0 && (meta.pendingPrincipalBaseline ?? loan.amount - (loan.startingPaidAmount || 0)) <= 0.01) {
      return false;
    }
    if (loan.installments > 0 && (meta.paidInstallmentsBaseline || 0) >= loan.installments) return false;
    return true;
  });
  const activeAutonomousMortgageIds = new Set(activeAutonomousMortgages.map((l) => l.id));

  // 2. Identify orphaned pending transactions (from deleted rules or inactive mortgages) to delete
  const idsToDelete = new Set<string>();
  transactions.forEach((t) => {
    if (t.isPending && t.id.startsWith("rec_loan_")) {
      const parts = t.id.split("_");
      const loanId = parts.length >= 4 ? parts.slice(2, parts.length - 1).join("_") : "";
      if (!activeAutonomousMortgageIds.has(loanId)) {
        idsToDelete.add(t.id);
      }
    } else if (t.isPending && t.id.startsWith("rec_")) {
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
          const cleanExistingTx = existingTx;
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

  // 4. For each autonomous mortgage loan (without an active linked rule in Gastos Fijos), generate pending monthly receipts
  activeAutonomousMortgages.forEach((loan) => {
    const meta = loan.originalTransactionData as MortgageMetadata;
    const billingDay = Math.min(31, Math.max(1, Math.round(meta.billingDay ?? 31)));

    const defaultLimit = addYears(today, 1);
    let limitDate = defaultLimit;
    if (meta.endDate) {
      const parsedEnd = parseISO(meta.endDate);
      if (!isNaN(parsedEnd.getTime()) && isBefore(parsedEnd, limitDate)) {
        limitDate = parsedEnd;
      }
    }

    const baselineRaw = meta.baselineDate || loan.startDate;
    let baselineDate = baselineRaw
      ? parseISO(baselineRaw)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    if (isNaN(baselineDate.getTime())) {
      baselineDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const isExtraAmortizationTx = (t: Transaction) =>
      String(t.id || "").startsWith("amort_") ||
      String(t.description || "").toLowerCase().includes("amortización anticipada") ||
      String(t.description || "").toLowerCase().includes("amortización parcial");

    let monthCursor = new Date(baselineDate.getFullYear(), baselineDate.getMonth(), 1);
    const baselineStr = format(baselineDate, "yyyy-MM-dd");
    const confirmedSinceBaseline = transactions.filter(
      (t) =>
        !t.isPending &&
        !t.isIgnored &&
        !isExtraAmortizationTx(t) &&
        t.type === "expense" &&
        t.date >= baselineStr &&
        (t.linkedLoanId === loan.id || t.id.startsWith(`rec_loan_${loan.id}_`))
    ).length;
    const remainingInstallments =
      loan.installments > 0
        ? Math.max(0, loan.installments - ((meta.paidInstallmentsBaseline || 0) + confirmedSinceBaseline))
        : 24;

    const generatedLoanIds = new Set<string>();
    let iterations = 0;
    let pendingCount = 0;
    const MAX_LOAN_ITERATIONS = 36;

    while (iterations < MAX_LOAN_ITERATIONS && pendingCount < remainingInstallments) {
      iterations++;
      const clampedDay = Math.min(billingDay, getDaysInMonth(monthCursor));
      const occurrenceDate = setDate(monthCursor, clampedDay);

      if (isAfter(occurrenceDate, limitDate)) {
        break;
      }

      if (!isBefore(occurrenceDate, baselineDate)) {
        const dateStr = format(occurrenceDate, "yyyy-MM-dd");
        const monthKey = format(occurrenceDate, "yyyy-MM");
        const txId = `rec_loan_${loan.id}_${dateStr}`;

        // Avoid duplicate pending charges if a confirmed payment for this mortgage already exists in this month
        const hasConfirmedInMonth = transactions.some(
          (t) =>
            !t.isPending &&
            !t.isIgnored &&
            !isExtraAmortizationTx(t) &&
            t.date.startsWith(monthKey) &&
            (t.id === txId || t.linkedLoanId === loan.id)
        );

        if (!hasConfirmedInMonth) {
          generatedLoanIds.add(txId);
          pendingCount++;

          const existingTx = transactions.find((t) => t.id === txId);
          if (existingTx) {
            if (existingTx.isPending) {
              transactionsToUpsert.push({
                ...existingTx,
                date: dateStr,
                amount: loan.installmentAmount,
                category: meta.category || existingTx.category || "Vivienda",
                accountId: loan.accountId,
                type: "expense",
                description: loan.name,
                linkedLoanId: loan.id,
              });
            }
          } else {
            transactionsToUpsert.push({
              id: txId,
              date: dateStr,
              amount: loan.installmentAmount,
              category: meta.category || "Vivienda",
              accountId: loan.accountId,
              type: "expense",
              description: loan.name,
              isPending: true,
              linkedLoanId: loan.id,
            });
          }
        }
      }

      monthCursor = addMonths(monthCursor, 1);
    }

    // Clean up obsolete pending transactions for THIS autonomous mortgage
    transactions.forEach((t) => {
      if (t.isPending && t.id.startsWith(`rec_loan_${loan.id}_`)) {
        if (!generatedLoanIds.has(t.id)) {
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
