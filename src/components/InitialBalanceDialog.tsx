import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Building2, Banknote } from 'lucide-react';

interface InitialBalanceDialogProps {
  isOpen: boolean;
  onSave: (bankBalance: number, cashBalance: number) => void;
}

const InitialBalanceDialog = ({ isOpen, onSave }: InitialBalanceDialogProps) => {
  const [bankBalance, setBankBalance] = useState('');
  const [cashBalance, setCashBalance] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bankNum = parseFloat(bankBalance) || 0;
    const cashNum = parseFloat(cashBalance) || 0;
    onSave(bankNum, cashNum);
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={() => {}}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-2xl flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Bienvenido a tu Gestor Financiero
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-base pt-2">
            Para comenzar, ingresa tus saldos iniciales. Estos serán el punto de partida para calcular tus balances.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-4 sm:px-0">
          <div className="space-y-2">
            <Label htmlFor="bankBalance" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Saldo en Banco
            </Label>
            <Input
              id="bankBalance"
              type="number"
              step="0.01"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cashBalance" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Saldo en Efectivo
            </Label>
            <Input
              id="cashBalance"
              type="number"
              step="0.01"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
              placeholder="0.00"
              className="text-lg"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
          >
            Comenzar
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default InitialBalanceDialog;
