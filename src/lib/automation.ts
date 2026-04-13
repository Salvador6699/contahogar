import { addDays, addWeeks, addMonths, addYears, format, isBefore, isEqual, parseISO } from 'date-fns';
import { RecurringTransaction, Transaction, RecurrenceFrequency } from '@/types/finance';
import { loadData, saveData } from './storage';

export const processRecurringTransactions = (): { created: number; current: number } => {
  const data = loadData();
  const now = new Date();
  const yearEnd = addYears(now, 1); // Project 1 year ahead
  let createdCount = 0;
  let dataChanged = false;

  if (!data.recurringTransactions || data.recurringTransactions.length === 0) {
    return { created: 0, current: 0 };
  }

  data.recurringTransactions.forEach(template => {
    if (!template.isActive) return;

    // Start from the NEXT period after startDate.
    // The startDate transaction is saved as a real (non-pending) transaction by the user.
    let nextGen = getNextDate(parseISO(template.startDate), template.frequency, template.intervalMonths);
    let safetyCounter = 0;
    const maxSafety = 500;

    // Compute end date if endAfterMonths is set
    const endDate = template.endAfterMonths
      ? addMonths(parseISO(template.startDate), template.endAfterMonths)
      : yearEnd;

    const effectiveEnd = isBefore(endDate, yearEnd) ? endDate : yearEnd;

    while (isBefore(nextGen, effectiveEnd) || isEqual(nextGen, effectiveEnd)) {
      if (safetyCounter >= maxSafety) break;
      safetyCounter++;

      const dateStr = format(nextGen, 'yyyy-MM-dd');
      const txId = `auto-${template.id}-${dateStr}`;

      // Only create if not already present (could be confirmed by user with same ID)
      const exists = data.transactions.some(t => t.id === txId);

      if (!exists) {
        const newTx: Transaction = {
          id: txId,
          date: dateStr,
          amount: template.amount,
          category: template.category,
          type: template.type,
          accountId: template.accountId,
          description: `Automático: ${template.name}`,
          isPending: true,
        };
        data.transactions.push(newTx);
        createdCount++;
        dataChanged = true;
      }

      nextGen = getNextDate(nextGen, template.frequency, template.intervalMonths);
    }
  });

  if (dataChanged) {
    saveData(data);
    // Automation complete: projections generated
  }

  return { created: createdCount, current: 0 };
};

const getNextDate = (date: Date, frequency: RecurrenceFrequency, intervalMonths?: number): Date => {
  switch (frequency) {
    case 'daily':         return addDays(date, 1);
    case 'weekly':        return addWeeks(date, 1);
    case 'monthly':       return addMonths(date, 1);
    case 'every_n_months': return addMonths(date, intervalMonths ?? 2);
    case 'yearly':        return addYears(date, 1);
    default:              return addMonths(date, 1);
  }
};
