import { useMemo } from 'react';
import { Transaction } from '@/types/finance';
import { parseISO, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const useMonthFilter = (transactions: Transaction[], selectedMonth: string | null) => {
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const isCurrentMonth = selectedMonth === null || selectedMonth === currentMonthKey;
  
  const filteredTransactions = useMemo(() => {
    const monthKey = selectedMonth || currentMonthKey;
    const monthStart = startOfMonth(parseISO(monthKey + '-01'));
    const monthEnd = endOfMonth(monthStart);

    return transactions.filter(transaction => {
      const transactionDate = parseISO(transaction.date);
      return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
    });
  }, [transactions, selectedMonth, currentMonthKey]);

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return null;
    const date = parseISO(selectedMonth + '-01');
    return format(date, 'MMMM yyyy', { locale: es });
  }, [selectedMonth]);

  return {
    filteredTransactions,
    isCurrentMonth,
    currentMonthKey,
    selectedMonthLabel,
  };
};
