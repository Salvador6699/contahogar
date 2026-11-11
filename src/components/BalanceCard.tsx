import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
  projectedBalance: number;
  compact?: boolean;
}

const BalanceCard = ({ balance, projectedBalance, compact = false }: BalanceCardProps) => {
  const isPositive = balance >= 0;
  const isProjectedPositive = projectedBalance >= 0;
  const hasPendingTransactions = balance !== projectedBalance;

  return (
    <Card
      className={cn(
        'bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_20px_50px_-12px_rgba(var(--primary),0.5)] border border-white/10 overflow-hidden relative group',
        compact ? 'p-6 sm:p-8 rounded-[32px] tabular-nums' : 'p-10 sm:p-12 rounded-[40px]'
      )}
    >
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute top-0 right-0 -mt-8 -mr-8 p-8 opacity-20 pointer-events-none blur-[2px]">
        <TrendingUp className="w-64 h-64 transform rotate-12 text-white/40" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="flex flex-col items-center justify-center text-center space-y-2 relative z-10">
        <h2
          className={cn(
            'text-sm font-extrabold tracking-[0.2em] uppercase text-white/80',
            compact ? 'mb-1' : 'mb-2'
          )}
        >
          Saldo Total
        </h2>
        <div className={compact ? 'py-1' : 'py-2'}>
          <p
            className={cn(
              'font-black tracking-tighter drop-shadow-md',
              compact ? 'text-5xl sm:text-6xl tabular-nums' : 'text-6xl sm:text-7xl',
              !isPositive ? 'text-red-300' : 'text-white'
            )}
          >
            {formatCurrency(balance)}
          </p>
        </div>
        
        {hasPendingTransactions && (
          <div
            className={cn(
              'border-t border-white/20 flex flex-col items-center w-full max-w-sm',
              compact ? 'mt-4 pt-4 px-8' : 'mt-8 pt-6 px-12'
            )}
          >
            <p className="text-[11px] font-black opacity-70 mb-1 uppercase tracking-[0.2em]">Saldo Previsto (Futuros)</p>
            <p
              className={cn(
                'text-2xl font-bold',
                compact && 'tabular-nums',
                !isProjectedPositive ? 'text-red-300' : 'text-white'
              )}
            >
              {formatCurrency(projectedBalance)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BalanceCard;
