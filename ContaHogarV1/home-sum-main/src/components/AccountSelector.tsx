import { AccountView } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Building2, Banknote, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface AccountSelectorProps {
  selectedAccount: AccountView;
  onSelectAccount: (account: AccountView) => void;
  bankBalance: number;
  cashBalance: number;
}

const AccountSelector = ({
  selectedAccount,
  onSelectAccount,
  bankBalance,
  cashBalance,
}: AccountSelectorProps) => {
  const totalBalance = bankBalance + cashBalance;

  return (
    <div className="flex gap-2">
      <Button
        variant={selectedAccount === 'total' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('total')}
        className="flex items-center gap-2 flex-1"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">Total</span>
        <span className="font-semibold">{formatCurrency(totalBalance)}</span>
      </Button>
      <Button
        variant={selectedAccount === 'bank' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('bank')}
        className="flex items-center gap-2 flex-1"
      >
        <Building2 className="w-4 h-4" />
        <span className="hidden sm:inline">Banco</span>
        <span className="font-semibold">{formatCurrency(bankBalance)}</span>
      </Button>
      <Button
        variant={selectedAccount === 'cash' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectAccount('cash')}
        className="flex items-center gap-2 flex-1"
      >
        <Banknote className="w-4 h-4" />
        <span className="hidden sm:inline">Efectivo</span>
        <span className="font-semibold">{formatCurrency(cashBalance)}</span>
      </Button>
    </div>
  );
};

export default AccountSelector;
