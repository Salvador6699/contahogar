import { useState, useEffect } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountType, Transaction } from '@/types/finance';
import { formatCurrency } from '@/lib/calculations';
import { Building2, Banknote, ArrowRight, Pencil, Trash2 } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (amount: number, from: AccountType, to: AccountType) => void;
  bankBalance: number;
  cashBalance: number;
  transferTransactions: Transaction[];
  onEditTransfer: (transaction: Transaction) => void;
  onDeleteTransfer: (transactionId: string) => void;
}

const TransferModal = ({
  isOpen,
  onClose,
  onTransfer,
  bankBalance,
  cashBalance,
  transferTransactions,
  onEditTransfer,
  onDeleteTransfer,
}: TransferModalProps) => {
  const [amount, setAmount] = useState('');
  const [fromAccount, setFromAccount] = useState<AccountType>('bank');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setFromAccount('bank');
    }
  }, [isOpen]);

  const toAccount: AccountType = fromAccount === 'bank' ? 'cash' : 'bank';
  const maxAmount = fromAccount === 'bank' ? bankBalance : cashBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    onTransfer(amountNum, fromAccount, toAccount);
    setAmount('');
  };

  const toggleDirection = () => {
    setFromAccount(fromAccount === 'bank' ? 'cash' : 'bank');
  };

  // Group transfer pairs by matching amount + date (expense out = the main record)
  const transferPairs = transferTransactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDeletePair = (expenseTransfer: Transaction) => {
    // Find matching income transfer
    const matchingIncome = transferTransactions.find(
      t => t.type === 'income' && 
           t.amount === expenseTransfer.amount && 
           t.date === expenseTransfer.date &&
           t.id !== expenseTransfer.id
    );
    onDeleteTransfer(expenseTransfer.id);
    if (matchingIncome) {
      onDeleteTransfer(matchingIncome.id);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[450px] max-h-[85vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-xl">Transferir entre cuentas</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account direction */}
          <div className="space-y-3">
            <Label>Dirección de la transferencia</Label>
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              <div className="flex flex-col items-center gap-1">
                {fromAccount === 'bank' ? (
                  <Building2 className="w-8 h-8 text-primary" />
                ) : (
                  <Banknote className="w-8 h-8 text-primary" />
                )}
                <span className="text-xs font-medium">
                  {fromAccount === 'bank' ? 'Banco' : 'Efectivo'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(fromAccount === 'bank' ? bankBalance : cashBalance)}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleDirection}
                className="rounded-full"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <div className="flex flex-col items-center gap-1">
                {toAccount === 'bank' ? (
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Banknote className="w-8 h-8 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">
                  {toAccount === 'bank' ? 'Banco' : 'Efectivo'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(toAccount === 'bank' ? bankBalance : cashBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="transferAmount">Importe</Label>
            <Input
              id="transferAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Disponible: {formatCurrency(maxAmount)}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
            >
              Transferir
            </Button>
          </div>
        </form>

        {/* Transfer History */}
        {transferPairs.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Historial de transferencias
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {transferPairs.map((transfer) => {
                const matchingIncome = transferTransactions.find(
                  t => t.type === 'income' &&
                       t.amount === transfer.amount &&
                       t.date === transfer.date &&
                       t.id !== transfer.id
                );
                const fromLabel = transfer.account === 'bank' ? 'Banco' : 'Efectivo';
                const toLabel = matchingIncome?.account === 'bank' ? 'Banco' : 'Efectivo';

                return (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {fromLabel} → {toLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.date).toLocaleDateString('es-ES')} · {formatCurrency(transfer.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditTransfer(transfer)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePair(transfer)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default TransferModal;
