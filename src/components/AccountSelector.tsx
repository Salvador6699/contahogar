import { Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface AccountSelectorProps {
  selectedAccount: string | 'total';
  onSelectAccount: (account: string | 'total') => void;
  accounts: Account[];
  accountBalances: Array<{ account: Account; balance: number; projectedBalance: number }>;
}

const AccountSelector = ({
  selectedAccount,
  onSelectAccount,
  accounts,
  accountBalances,
}: AccountSelectorProps) => {
  const totalBalance = accountBalances
    .filter((ab) => !ab.account.excludeFromTotals)
    .reduce((sum, ab) => sum + ab.balance, 0);

  const totalProjectedBalance = accountBalances
    .filter((ab) => !ab.account.excludeFromTotals)
    .reduce((sum, ab) => sum + ab.projectedBalance, 0);

  const hasTotalPending = Math.abs(totalProjectedBalance - totalBalance) > 0.005;

  const getProjectedClassName = (projected: number, isSelected: boolean) => {
    if (projected < 0) {
      return isSelected ? "text-red-200" : "text-destructive";
    }
    return isSelected ? "text-primary-foreground/80" : "text-muted-foreground";
  };

  return (
    <div className="flex flex-col sm:flex-row w-full gap-2">
      {/* Global Balance - Full width on mobile, stretches on PC */}
      <Button
        variant={selectedAccount === 'total' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('total')}
        className={cn(
          "flex items-center justify-between gap-2 px-3 sm:px-3.5 h-auto min-h-10 sm:min-h-11 py-1.5 rounded-xl sm:flex-1 transition-all",
          "w-full order-1"
        )}
      >
        <div className="flex items-center gap-1.5">
          <Wallet className="w-4 h-4 opacity-70" />
          <span className="text-[11px] font-black uppercase tracking-wider">Total</span>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="font-bold tabular-nums text-xs sm:text-sm">{formatCurrency(totalBalance)}</span>
          {hasTotalPending && (
            <span
              className={cn(
                "text-[9px] sm:text-[10px] font-semibold tabular-nums",
                getProjectedClassName(totalProjectedBalance, selectedAccount === 'total')
              )}
            >
              Prev: {formatCurrency(totalProjectedBalance)}
            </span>
          )}
        </div>
      </Button>

      {/* Account List - Grid on mobile, stretches on desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-[3] gap-2 order-2 w-full">
        {accountBalances.map((ab) => {
          const isSelected = selectedAccount === ab.account.id;
          const mainAmount = ab.account.linkedAccountId ? ab.projectedBalance : ab.balance;
          const hasPending = !ab.account.linkedAccountId && Math.abs(ab.projectedBalance - ab.balance) > 0.005;

          return (
            <Button
              key={ab.account.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectAccount(ab.account.id)}
              className="flex flex-row items-center justify-between gap-1.5 h-auto min-h-10 sm:min-h-11 py-1.5 px-2.5 sm:px-3.5 rounded-xl min-w-0 flex-1 transition-all"
            >
              <div className="flex items-center justify-start gap-1.5 max-w-full min-w-0">
                {ab.account.logo && (
                  <img src={ab.account.logo} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0 bg-white" />
                )}
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate">
                  {ab.account.name}
                </span>
              </div>
              <div className="flex flex-col items-end leading-tight shrink-0">
                <span className="font-bold tabular-nums text-xs sm:text-sm whitespace-nowrap">
                  {formatCurrency(mainAmount)}
                </span>
                {hasPending && (
                  <span
                    className={cn(
                      "text-[9px] sm:text-[10px] font-semibold tabular-nums whitespace-nowrap",
                      getProjectedClassName(ab.projectedBalance, isSelected)
                    )}
                  >
                    Prev: {formatCurrency(ab.projectedBalance)}
                  </span>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default AccountSelector;
