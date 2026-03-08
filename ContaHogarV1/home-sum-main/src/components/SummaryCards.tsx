import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
}

const SummaryCards = ({ totalIncome, totalExpenses }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-5 border-2 border-income/20 bg-income-light hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-income rounded-lg">
            <ArrowUpCircle className="w-6 h-6 text-income-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Total Ingresos</p>
            <p className="text-2xl font-bold text-income">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 border-2 border-expense/20 bg-expense-light hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-expense rounded-lg">
            <ArrowDownCircle className="w-6 h-6 text-expense-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Total Gastos</p>
            <p className="text-2xl font-bold text-expense">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SummaryCards;
