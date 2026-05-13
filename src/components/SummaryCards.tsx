import { Card } from '@/components/ui/card';
import { formatCurrency, MonthlyHistory } from '@/lib/calculations';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
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

const TrendBadge = ({ value, isExpense = false }: { value: number | null, isExpense?: boolean }) => {
  if (value === null) return null;
  const isUp = value > 0;
  const isNeutral = Math.abs(value) < 1;

  if (isNeutral) return (
    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
      <Minus className="w-2.5 h-2.5" />
      <span>0%</span>
    </div>
  );

  // Explicit logic for color and icons
  let colorClass = "";
  let Icon = isUp ? TrendingUp : TrendingDown;

  if (!isExpense) {
    // INCOME LOGIC
    colorClass = isUp ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10";
  } else {
    // EXPENSE LOGIC
    colorClass = isUp ? "text-red-500 bg-red-500/10" : "text-green-500 bg-green-500/10";
  }

  return (
    <div className={cn("flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full", colorClass)}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(Math.round(value))}%</span>
    </div>
  );
};

const Sparkline = ({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) => (
  <div className="h-10 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#grad-${dataKey})`}
          isAnimationActive={false}
          animationDuration={0}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-income/10 rounded-xl group-hover:bg-income/20 transition-colors">
                <ArrowUpCircle className="w-5 h-5 text-income" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ingresos</p>
                <p className="text-xl font-black text-foreground tabular-nums">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
            <Sparkline data={history} dataKey="income" color="rgb(34, 197, 94)" />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/5">
            <span className="text-[10px] font-bold text-muted-foreground/60 italic">vs mes ant.</span>
            <TrendBadge value={incomeTrend} />
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-expense/10 rounded-xl group-hover:bg-expense/20 transition-colors">
                <ArrowDownCircle className="w-5 h-5 text-expense" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Gastos</p>
                <p className="text-xl font-black text-foreground tabular-nums">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
            <Sparkline data={history} dataKey="expense" color="rgb(239, 68, 68)" />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/5">
            <span className="text-[10px] font-bold text-muted-foreground/60 italic">vs mes ant.</span>
            <TrendBadge value={expenseTrend} isExpense={true} />
          </div>
        </div>
      </Card>

      {/* Pace Indicator (Optional/Extra) */}
      {spendingPace && (
        <Dialog>
          <DialogTrigger asChild>
            <Card className="p-4 border-none shadow-sm bg-primary/5 dark:bg-primary/10 overflow-hidden relative cursor-pointer hover:bg-primary/10 transition-colors group">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">Proyección a Fin de Mes</p>
                    <Info className="w-3 h-3 text-primary/40 group-hover:text-primary/70" />
                  </div>
                  <p className="text-sm font-black text-primary italic">Total Estimado: {formatCurrency(spendingPace.pace)}</p>
                </div>
                <div className="flex-1 max-w-[100px] h-1.5 bg-primary/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${(spendingPace.daysPassed / spendingPace.totalDays) * 100}%` }}
                  />
                </div>
              </div>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Desglose de Proyección</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Gastos reales acumulados este mes:</span>
                <span className="font-semibold">{formatCurrency(spendingPace.currentMonthExpenses || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground opacity-80">Gastos previstos (basados en mes anterior):</span>
                <span className="font-semibold text-muted-foreground">{formatCurrency(spendingPace.previousMonthRemainingExpenses || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-primary/5 rounded-lg px-3">
                <span className="font-bold text-primary">Total Proyectado a Fin de Mes:</span>
                <span className="font-black text-primary text-lg">{formatCurrency(spendingPace.pace)}</span>
              </div>
              
              {spendingPace.previousMonthRemainingCategories && spendingPace.previousMonthRemainingCategories.length > 0 && (
                <div className="pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalle de gastos previstos por categoría</h4>
                  <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                    <div className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
                      {spendingPace.previousMonthRemainingCategories.map((cat, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 hover:bg-muted/50 transition-colors text-sm">
                          <span>{cat.category}</span>
                          <span className="font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

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
