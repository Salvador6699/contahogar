import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionType, Category, Account } from '@/types/finance';
import { Zap, DollarSign, Tag, Building2, Check, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn, withKeyboardClose } from '@/lib/utils';

interface QuickAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, accountId: string) => void;
  categoryName: string;
  accountId: string;
  type: TransactionType;
  accounts: Account[];
  categories: Category[];
  favoriteName: string;
}

const QuickAmountModal = ({
  isOpen,
  onClose,
  onSave,
  categoryName,
  accountId,
  type,
  accounts,
  categories,
  favoriteName,
}: QuickAmountModalProps) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'account' | 'amount'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState(accountId);
  const inputRef = useRef<HTMLInputElement>(null);

  const account = accounts.find(a => a.id === selectedAccountId);
  const category = categories.find(c => c.name === categoryName);
  const IconComponent = (Icons as any)[category?.icon || 'Tag'] || Icons.Tag;

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setStep('account');
      setSelectedAccountId(accountId);
    }
  }, [isOpen, accountId]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const amountNum = parseFloat(amount);
    if (!isNaN(amountNum) && amountNum > 0) {
      onSave(amountNum, selectedAccountId);
      onClose();
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
    // Auto-save if it's a quick tap? Maybe just fill it.
  };

  const quickAmounts = type === 'expense' ? [5, 10, 20, 50] : [100, 500, 1000];

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[400px] border-none shadow-2xl overflow-hidden p-0 max-h-[85vh] flex flex-col">
        {step === 'amount' && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20 z-10">
            <div
              className="h-full bg-primary"
              style={{ width: amount ? '100%' : '0%', transition: 'width 0.3s ease' }}
            />
          </div>
        )}

        {step === 'account' ? (
          <div className="p-6 space-y-6 overflow-y-auto">
            <p className="text-center text-muted-foreground text-lg font-medium">
              ¿En qué cuenta quieres registrar <strong className="text-foreground">{favoriteName}</strong>?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(acc.id);
                    setStep('amount');
                    setTimeout(() => {
                      inputRef.current?.focus();
                    }, 300);
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 bg-card shadow-sm",
                    selectedAccountId === acc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                >
                  {acc.logo ? (
                    <img src={acc.logo} alt={acc.name} className="w-10 h-10 object-contain drop-shadow-sm rounded-sm" />
                  ) : (
                    <Building2 className={cn("w-10 h-10", selectedAccountId === acc.id ? "text-primary" : "text-muted-foreground")} />
                  )}
                  <span className="font-bold text-lg text-center leading-tight">{acc.name}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full h-12" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="p-6 pt-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <ResponsiveDialogHeader className="space-y-4 shrink-0">
              <div className="flex items-center justify-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-500"
                  style={{ backgroundColor: category?.color || '#3b82f6' }}
                >
                  <IconComponent className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <ResponsiveDialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    {favoriteName}
                  </ResponsiveDialogTitle>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {categoryName} • {account?.name}
                  </p>
                </div>
              </div>
            </ResponsiveDialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                  <DollarSign className="w-8 h-8" />
                </div>
                <Input
                  ref={inputRef}
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-20 text-4xl font-black pl-14 pr-4 bg-muted/30 border-none rounded-3xl text-center focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {quickAmounts.map(val => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(val)}
                    className="rounded-full px-4 h-9 font-bold bg-muted/50 border-none hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                  >
                    {val}€
                  </Button>
                ))}
              </div>

              <div className="flex gap-3 pt-4 mt-auto border-t border-border/20">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('account')}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-muted-foreground hover:bg-muted"
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  disabled={!amount || parseFloat(amount) <= 0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.click();
                  }}
                  className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
                  variant="default"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Confirmar
                </Button>
              </div>
            </form>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default QuickAmountModal;
