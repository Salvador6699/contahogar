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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Transaction, TransactionType, Account, Category } from '@/types/finance';
import { getCategorySuggestions, findSimilarCategory, loadData } from '@/lib/storage';
import { Calendar, DollarSign, Tag, Building2, Banknote, Clock } from 'lucide-react';
import { useScrollOnFocus } from '@/hooks/useScrollOnFocus';
import { withKeyboardClose } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, copyToNextMonth?: boolean, recurringOptions?: { frequency: string }) => void;
  type: TransactionType;
  categories: (string | Category)[];
  editingTransaction?: Transaction | null;
}

const TransactionModal = ({
  isOpen,
  onClose,
  onSave,
  type,
  categories,
  editingTransaction = null,
}: TransactionModalProps) => {
  const scrollOnFocus = useScrollOnFocus(240);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [copyToNextMonth, setCopyToNextMonth] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load accounts from storage
      const data = loadData();
      setAccounts(data.accounts);
      const defaultAccountId = data.accounts.length > 0 ? data.accounts[0].id : '';

      if (editingTransaction) {
        // Editing mode - populate with existing data
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toString());
        setCategory(editingTransaction.category);
        setAccountId(editingTransaction.accountId);
        setIsPending(editingTransaction.isPending || false);
        setCopyToNextMonth(false);
      } else {
        // New transaction - set today's date
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setAmount('');
        setCategory('');
        setAccountId(defaultAccountId);
        setIsPending(false);
        setCopyToNextMonth(false);
      }
    }
  }, [isOpen, editingTransaction]);

  useEffect(() => {
    if (category) {
      const filtered = getCategorySuggestions(category, categories);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && category.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [category, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !amount || !category) {
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    // Check for similar category and use existing one if found
    const existingCategory = findSimilarCategory(category, categories) || category;

    onSave({
      date,
      amount: amountNum,
      category: existingCategory,
      type,
      accountId,
      isPending,
    }, copyToNextMonth, isRecurring ? { frequency } : undefined);

    // Reset form only if not editing
    if (!editingTransaction) {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setCategory('');
      setAccountId(accounts.length > 0 ? accounts[0].id : '');
      setIsPending(false);
      setCopyToNextMonth(false);
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const selectSuggestion = (suggestion: string) => {
    setCategory(suggestion);
    setShowSuggestions(false);
  };

  const handleCategoryBlur = () => {
    // Small delay to allow click on suggestion to register
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const title = editingTransaction
    ? (type === 'expense' ? 'Editar Gasto' : 'Editar Ingreso')
    : (type === 'expense' ? 'Agregar Gasto' : 'Agregar Ingreso');
  const buttonClass = type === 'expense' ? 'bg-expense hover:bg-expense/90' : 'bg-income hover:bg-income/90';

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-2xl">{title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Cuenta
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPending"
                checked={isPending}
                onChange={(e) => setIsPending(e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isPending" className="cursor-pointer">
                Marcar como transacción futura/prevista
              </Label>
            </div>
            <div className="space-y-4 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                <Label htmlFor="isRecurring" className="cursor-pointer font-bold text-primary flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Hacer este gasto recurrente (Fijo)
                </Label>
              </div>

              {isRecurring && (
                <div className="pl-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="frequency" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">¿Cada cuánto tiempo?</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger id="frequency" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensualmente</SelectItem>
                      <SelectItem value="yearly">Anualmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Importe
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full"
              onFocus={scrollOnFocus}
            />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categoría
            </Label>
            <Input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Supermercado"
              required
              className="w-full"
              autoComplete="off"
              onFocus={scrollOnFocus}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => withKeyboardClose(() => selectSuggestion(suggestion))}
                    onPointerDown={() => withKeyboardClose(() => selectSuggestion(suggestion))}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all border border-border font-medium shadow-sm animate-in fade-in zoom-in duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
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
              onClick={() => withKeyboardClose(() => { })}
              onPointerDown={() => withKeyboardClose(() => { })}
              className={`flex-1 text-white ${buttonClass}`}
            >
              Guardar
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default TransactionModal;
