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
    <div className="flex flex-col sm:flex-row w-full gap-3">
      {/* Global Balance - Full width on mobile, stretches on PC */}
      <Button
        variant={selectedAccount === 'total' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('total')}
        className={cn(
          "flex items-center justify-between gap-3 px-4 h-12 sm:h-14 sm:flex-1 transition-all",
          "w-full order-1"
        )}
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 opacity-70" />
          <span className="text-xs font-black uppercase tracking-wider">Total</span>
        </div>
        <span className="font-bold tabular-nums text-sm sm:text-base">{formatCurrency(totalBalance)}</span>
      </Button>

      {/* Account List - Grid on mobile, stretches on desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-[2] gap-3 order-2 w-full">
        {accountBalances.map((ab) => (
          <Button
            key={ab.account.id}
            variant={selectedAccount === ab.account.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectAccount(ab.account.id)}
            className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-2 h-14 sm:h-14 px-3 sm:px-4 min-w-0 flex-1 transition-all"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              {ab.account.logo && (
                <img src={ab.account.logo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 bg-white" />
              )}
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate mr-1">
                {ab.account.name}
              </span>
            </div>
            <span className="font-bold tabular-nums text-xs sm:text-sm whitespace-nowrap">
              {formatCurrency(ab.account.linkedAccountId ? ab.projectedBalance : ab.balance)}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AccountSelector;
