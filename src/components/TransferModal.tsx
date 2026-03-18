import { useState, useEffect } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Account, Transaction } from '@/types/finance';
import { formatCurrency, calculateAccountBalance } from '@/lib/calculations';
import { loadData } from '@/lib/storage';
import { ArrowRight, Pencil, Trash2 } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (amount: number, fromAccountId: string, toAccountId: string) => void;
  transferTransactions: Transaction[];
  onEditTransfer: (transaction: Transaction) => void;
  onDeleteTransfer: (transactionId: string) => void;
}

const TransferModal = ({
  isOpen,
  onClose,
  onTransfer,
  transferTransactions,
  onEditTransfer,
  onDeleteTransfer,
}: TransferModalProps) => {
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (isOpen) {
      const data = loadData();
      setAccounts(data.accounts);
      setAllTransactions(data.transactions);

      // Set default accounts
      if (data.accounts.length >= 2) {
        setFromAccountId(data.accounts[0].id);
        setToAccountId(data.accounts[1].id);
      } else if (data.accounts.length === 1) {
        setFromAccountId(data.accounts[0].id);
        setToAccountId(data.accounts[0].id);
      }

      setAmount('');
    }
  }, [isOpen]);

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);
  const maxAmount = fromAccount ? calculateAccountBalance(fromAccount, allTransactions) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || !fromAccountId || !toAccountId) return;
    onTransfer(amountNum, fromAccountId, toAccountId);
    setAmount('');
  };

  const swapAccounts = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  };

  // Group transfer pairs by matching amount + date
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
          {/* From Account */}
          <div className="space-y-2">
            <Label htmlFor="fromAccount">Transferir desde</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger id="fromAccount">
                <SelectValue placeholder="Selecciona cuenta origen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - {formatCurrency(calculateAccountBalance(acc, allTransactions))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swapAccounts}
              className="rounded-full"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label htmlFor="toAccount">Transferir a</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger id="toAccount">
                <SelectValue placeholder="Selecciona cuenta destino" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - {formatCurrency(calculateAccountBalance(acc, allTransactions))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
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
                const fromAcc = accounts.find(a => a.id === transfer.accountId);
                const toAcc = matchingIncome ? accounts.find(a => a.id === matchingIncome.accountId) : null;

                return (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {fromAcc?.name} → {toAcc?.name}
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
