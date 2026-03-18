import { Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

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
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selectedAccount === 'total' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('total')}
        className="flex items-center gap-2 flex-1 min-w-max"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">Total</span>
        <span className="font-semibold">{formatCurrency(totalBalance)}</span>
      </Button>
      {accountBalances.map((ab) => (
        <Button
          key={ab.account.id}
          variant={selectedAccount === ab.account.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectAccount(ab.account.id)}
          className="flex items-center gap-2 flex-1 min-w-max"
        >
          <span className="hidden sm:inline">{ab.account.name}</span>
          <span className="font-semibold">{formatCurrency(ab.balance)}</span>
        </Button>
      ))}
    </div>
  );
};

export default AccountSelector;
