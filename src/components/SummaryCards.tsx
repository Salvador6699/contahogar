import { Card } from '@/components/ui/card';
import { formatCurrency, MonthlyHistory } from '@/lib/calculations';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import TransactionList from '@/components/TransactionList';
import { Transaction } from '@/types/finance';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  history: MonthlyHistory[];
  spendingPace?: { 
    pace: number, 
    daysPassed: number, 
    totalDays: number,
    currentMonthExpenses?: number,
    previousMonthRemainingExpenses?: number,
    previousMonthRemainingCategories?: { category: string, amount: number }[]
  };
  transactions?: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transactionId: string) => void;
}



const SummaryCards = ({ totalIncome, totalExpenses, history, spendingPace, transactions = [], onEditTransaction, onDeleteTransaction }: SummaryCardsProps) => {
  const [openModal, setOpenModal] = useState<'income' | 'expense' | null>(null);

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  const lastMonth = history.length >= 2 ? history[history.length - 2] : null;
  const isCurrentMonth = !!spendingPace;

  const calculateTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return diff;
  };

  const incomeTrend = lastMonth 
    ? calculateTrend(totalIncome, isCurrentMonth ? lastMonth.incomeUpToDay : lastMonth.income) 
    : null;
    
  const expenseTrend = lastMonth 
    ? calculateTrend(totalExpenses, isCurrentMonth ? lastMonth.expenseUpToDay : lastMonth.expense) 
    : null;



  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
      {/* Ingresos Card */}
      <Card 
        className="p-5 border-none shadow-sm bg-white dark:bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative cursor-pointer active:scale-[0.98]"
        onClick={() => setOpenModal('income')}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-income" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-income/10 rounded-xl group-hover:bg-income/20 transition-colors">
                <ArrowUpCircle className="w-7 h-7 text-income" />
              </div>
              <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Ingresos</p>
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
      </Card>

      {/* Gastos Card */}
      <Card 
        className="p-5 border-none shadow-sm bg-white dark:bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative cursor-pointer active:scale-[0.98]"
        onClick={() => setOpenModal('expense')}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-expense" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-expense/10 rounded-xl group-hover:bg-expense/20 transition-colors">
                <ArrowDownCircle className="w-7 h-7 text-expense" />
              </div>
              <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Gastos</p>
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </Card>


      {/* Full screen transactions modal */}
      {openModal && (
        <ResponsiveDialog open={openModal !== null} onOpenChange={(open) => !open && setOpenModal(null)}>
          <ResponsiveDialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0">
            <ResponsiveDialogHeader className="px-6 pt-6 pb-2 shrink-0">
              <ResponsiveDialogTitle className="text-2xl flex items-center gap-2">
                {openModal === 'income' ? (
                  <><ArrowUpCircle className="w-6 h-6 text-income" /> Todos los Ingresos</>
                ) : (
                  <><ArrowDownCircle className="w-6 h-6 text-expense" /> Todos los Gastos</>
                )}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
              <TransactionList 
                transactions={openModal === 'income' ? incomeTransactions : expenseTransactions}
                onEdit={(t) => {
                  setOpenModal(null);
                  if (onEditTransaction) onEditTransaction(t);
                }}
                onDelete={(id) => {
                  if (onDeleteTransaction) onDeleteTransaction(id);
                }}
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}
    </div>
  );
};

export default SummaryCards;
