import { addDays, addWeeks, addMonths, addYears, format, isAfter, isBefore, isEqual, parseISO } from 'date-fns';
import { RecurringTransaction, Transaction, RecurrenceFrequency } from '@/types/finance';
import { loadData, saveData, addTransaction } from './storage';
import { toast } from 'sonner';

export const processRecurringTransactions = (): { created: number; current: number } => {
  const data = loadData();
  const now = new Date();
  const yearEnd = addYears(now, 1); // Project 1 year ahead
  const todayStr = format(now, 'yyyy-MM-dd');
  let createdCount = 0;
  let confirmedCount = 0;
  let dataChanged = false;

  if (!data.recurringTransactions || data.recurringTransactions.length === 0) {
    return { created: 0, current: 0 };
  }

  // Generate future projections
  const updatedRecurring = data.recurringTransactions.map(template => {
    if (!template.isActive) return template;

    let nextGen = parseISO(template.startDate);
    let safetyCounter = 0;
    const maxSafety = 500;

    while (isBefore(nextGen, yearEnd) || isEqual(nextGen, yearEnd)) {
      if (safetyCounter >= maxSafety) break;
      safetyCounter++;

      const dateStr = format(nextGen, 'yyyy-MM-dd');
      const txId = `auto-${template.id}-${dateStr}`;

      // Check if it already exists
      const existingIdx = data.transactions.findIndex(t => t.id === txId);
      
      if (existingIdx === -1) {
        // Create new as pending
        const newTx: Transaction = {
          id: txId,
          date: dateStr,
          amount: template.amount,
          category: template.category,
          type: template.type,
          accountId: template.accountId,
          description: `Automático: ${template.name}`,
          isPending: true // Always pending, user confirms manually
        };
        data.transactions.push(newTx);
        createdCount++;
        dataChanged = true;
      }

      nextGen = getNextDate(nextGen, template.frequency);
    }

    return template;
  });

  if (dataChanged) {
    saveData(data);
    if (createdCount > 0) {
      console.log(`Automation: ${createdCount} projections added.`);
    }
  }

  return { created: createdCount, current: confirmedCount };
};

const getNextDate = (date: Date, frequency: RecurrenceFrequency): Date => {
  switch (frequency) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addWeeks(date, 1);
    case 'monthly': return addMonths(date, 1);
    case 'yearly': return addYears(date, 1);
    default: return addMonths(date, 1);
  }
};
