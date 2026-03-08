import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
}

const SummaryCards = ({ totalIncome, totalExpenses }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
      <Card className="p-5 border-none shadow-sm bg-white dark:bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-income" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-income/10 rounded-xl group-hover:bg-income/20 transition-colors">
            <ArrowUpCircle className="w-6 h-6 text-income" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ingresos</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-none shadow-sm bg-white dark:bg-card hover:shadow-md transition-all duration-300 group overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-expense" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-expense/10 rounded-xl group-hover:bg-expense/20 transition-colors">
            <ArrowDownCircle className="w-6 h-6 text-expense" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gastos</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SummaryCards;
