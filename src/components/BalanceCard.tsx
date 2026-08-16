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
    <Card className="p-10 sm:p-12 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_20px_50px_-12px_rgba(var(--primary),0.5)] border border-white/10 overflow-hidden relative group rounded-[40px]">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute top-0 right-0 -mt-8 -mr-8 p-8 opacity-20 pointer-events-none blur-[2px]">
        <TrendingUp className="w-64 h-64 transform rotate-12 text-white/40" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="flex flex-col items-center justify-center text-center space-y-2 relative z-10">
        <h2 className="text-sm font-extrabold tracking-[0.2em] uppercase text-white/80 mb-2">Saldo Total</h2>
        <div className="py-2">
          <p className={`text-6xl sm:text-7xl font-black tracking-tighter drop-shadow-md ${!isPositive ? 'text-red-300' : 'text-white'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
        
        {hasPendingTransactions && (
          <div className="mt-8 pt-6 px-12 border-t border-white/20 flex flex-col items-center w-full max-w-sm">
            <p className="text-[11px] font-black opacity-70 mb-1 uppercase tracking-[0.2em]">Saldo Previsto (Futuros)</p>
            <p className={`text-2xl font-bold ${!isProjectedPositive ? 'text-red-300' : 'text-white'}`}>
              {formatCurrency(projectedBalance)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BalanceCard;
