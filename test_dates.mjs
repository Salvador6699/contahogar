import { parseISO, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

const txDate = '2026-09-01';
const transactionDate = parseISO(txDate);

const monthKey = '2026-09';
const monthStart = startOfMonth(parseISO(monthKey + '-01'));
const monthEnd = endOfMonth(monthStart);

console.log("transactionDate:", transactionDate);
console.log("monthStart:", monthStart);
console.log("monthEnd:", monthEnd);
console.log("isWithin:", isWithinInterval(transactionDate, { start: monthStart, end: monthEnd }));

const txDate2 = '2026-09-03';
console.log("isWithin2:", isWithinInterval(parseISO(txDate2), { start: monthStart, end: monthEnd }));
