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
    <div className="flex flex-col sm:flex-row w-full gap-3">
      {/* Global Balance - Full width on mobile, stretches on PC */}
      <Button
        variant={selectedAccount === 'total' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('total')}
        className={cn(
          "flex items-center justify-between gap-3 px-4 min-h-12 sm:min-h-14 py-2 sm:flex-1 transition-all",
          "w-full order-1"
        )}
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 opacity-70" />
          <span className="text-xs font-black uppercase tracking-wider">Total</span>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="font-bold tabular-nums text-sm sm:text-base">{formatCurrency(totalBalance)}</span>
          {hasTotalPending && (
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-semibold tabular-nums",
                getProjectedClassName(totalProjectedBalance, selectedAccount === 'total')
              )}
            >
              Prev: {formatCurrency(totalProjectedBalance)}
            </span>
          )}
        </div>
      </Button>

      {/* Account List - Grid on mobile, stretches on desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-[2] gap-3 order-2 w-full">
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
              className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-2 min-h-14 py-2 px-3 sm:px-4 min-w-0 flex-1 transition-all"
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                {ab.account.logo && (
                  <img src={ab.account.logo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 bg-white" />
                )}
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate mr-1">
                  {ab.account.name}
                </span>
              </div>
              <div className="flex flex-col items-center sm:items-end leading-tight">
                <span className="font-bold tabular-nums text-xs sm:text-sm whitespace-nowrap">
                  {formatCurrency(mainAmount)}
                </span>
                {hasPending && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums whitespace-nowrap",
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
