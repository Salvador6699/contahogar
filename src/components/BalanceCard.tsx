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
    <Card className="p-6 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-xl border-none overflow-hidden relative group">
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-sm font-medium tracking-wide uppercase opacity-80">Saldo Actual</h2>
        <div className="p-2 bg-white/10 rounded-full">
          {isPositive ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
        </div>
      </div>
      <div className="space-y-4 relative z-10">
        <div>
          <p className={`text-4xl sm:text-5xl font-bold tracking-tight ${!isPositive ? 'text-red-200' : ''}`}>
            {formatCurrency(balance)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-income' : 'bg-destructive'}`} />
            <p className="text-xs font-medium opacity-80">
              {isPositive ? 'Balance positivo' : 'Balance negativo'}
            </p>
          </div>
        </div>
        
        {hasPendingTransactions && (
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs font-medium opacity-70 mb-1">Saldo Previsto (incluye futuras)</p>
            <p className={`text-2xl font-bold ${!isProjectedPositive ? 'text-red-200' : ''}`}>
              {formatCurrency(projectedBalance)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BalanceCard;
