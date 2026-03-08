import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
  projectedBalance: number;
}

const BalanceCard = ({ balance, projectedBalance }: BalanceCardProps) => {
  const isPositive = balance >= 0;
  const isProjectedPositive = projectedBalance >= 0;
  const hasPendingTransactions = balance !== projectedBalance;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium opacity-90">Saldo Actual</h2>
        {isPositive ? (
          <TrendingUp className="w-5 h-5 opacity-90" />
        ) : (
          <TrendingDown className="w-5 h-5 opacity-90" />
        )}
      </div>
      <div className="space-y-3">
        <div>
          <p className={`text-4xl font-bold tracking-tight ${!isPositive ? 'text-red-200' : ''}`}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {isPositive ? 'Balance positivo' : 'Balance negativo'}
          </p>
        </div>
        
        {hasPendingTransactions && (
          <div className="pt-3 border-t border-primary-foreground/20">
            <p className="text-xs opacity-75 mb-1">Saldo Previsto (incluye futuras)</p>
            <p className={`text-2xl font-semibold ${!isProjectedPositive ? 'text-red-200' : ''}`}>
              {formatCurrency(projectedBalance)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BalanceCard;
