import { Card } from '@/components/ui/card';
import { formatCurrency, MonthlyHistory } from '@/lib/calculations';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  history: MonthlyHistory[];
  spendingPace?: { pace: number, daysPassed: number, totalDays: number };
}

const SummaryCards = ({ totalIncome, totalExpenses, history, spendingPace }: SummaryCardsProps) => {
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
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
      {/* Ingresos Card */}
      <Card className="p-5 border-none shadow-sm bg-white dark:bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative">
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
      <Card className="p-5 border-none shadow-sm bg-white dark:bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative">
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
        <Card className="p-4 border-none shadow-sm bg-primary/5 dark:bg-primary/10 overflow-hidden relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">Paso de Gasto</p>
              <p className="text-sm font-black text-primary italic">Proyección: {formatCurrency(spendingPace.pace)}</p>
            </div>
            <div className="flex-1 max-w-[100px] h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${(spendingPace.daysPassed / spendingPace.totalDays) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SummaryCards;
