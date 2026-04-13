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
  const totalBalance = accountBalances.reduce((sum, ab) => sum + ab.balance, 0);

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Global Balance - Full width on mobile */}
      <Button
        variant={selectedAccount === 'total' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('total')}
        className={cn(
          "flex items-center justify-between gap-3 px-4 h-11 sm:h-9 sm:flex-initial sm:min-w-max",
          "w-full sm:w-auto order-1"
        )}
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 opacity-70" />
          <span className="text-[10px] font-black uppercase tracking-wider">Total</span>
        </div>
        <span className="font-bold tabular-nums">{formatCurrency(totalBalance)}</span>
      </Button>

      {/* Account List - Grid on mobile, flex on desktop */}
      <div className="grid grid-cols-2 sm:flex gap-2 order-2 w-full sm:w-auto">
        {accountBalances.map((ab) => (
          <Button
            key={ab.account.id}
            variant={selectedAccount === ab.account.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectAccount(ab.account.id)}
            className="flex items-center justify-between sm:justify-center gap-2 h-11 sm:h-9 px-3 min-w-0"
          >
            <span className="text-[10px] font-black uppercase tracking-wider truncate mr-1">
              {ab.account.name}
            </span>
            <span className="font-bold tabular-nums text-xs whitespace-nowrap">
              {formatCurrency(ab.balance)}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AccountSelector;
