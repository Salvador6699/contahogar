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
import { Transaction, TransactionType, AccountType } from '@/types/finance';
import { getCategorySuggestions, findSimilarCategory } from '@/lib/storage';
import { Calendar, DollarSign, Tag, Building2, Banknote } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, copyToNextMonth?: boolean) => void;
  type: TransactionType;
  categories: string[];
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
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState<AccountType>('bank');
  const [isPending, setIsPending] = useState(false);
  const [copyToNextMonth, setCopyToNextMonth] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // Editing mode - populate with existing data
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toString());
        setCategory(editingTransaction.category);
        setAccount(editingTransaction.account || 'bank');
        setIsPending(editingTransaction.isPending || false);
        setCopyToNextMonth(false);
      } else {
        // New transaction - set today's date
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setAmount('');
        setCategory('');
        setAccount('bank');
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
      account,
      isPending,
    }, copyToNextMonth);

    // Reset form only if not editing
    if (!editingTransaction) {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setCategory('');
      setAccount('bank');
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
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Cuenta
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={account === 'bank' ? 'default' : 'outline'}
                onClick={() => setAccount('bank')}
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Banco
              </Button>
              <Button
                type="button"
                variant={account === 'cash' ? 'default' : 'outline'}
                onClick={() => setAccount('cash')}
                className="flex items-center gap-2"
              >
                <Banknote className="w-4 h-4" />
                Efectivo
              </Button>
            </div>
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
            {editingTransaction && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="copyToNextMonth"
                  checked={copyToNextMonth}
                  onChange={(e) => setCopyToNextMonth(e.target.checked)}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                <Label htmlFor="copyToNextMonth" className="cursor-pointer text-sm text-muted-foreground">
                  Copiar al mes siguiente como futura
                </Label>
              </div>
            )}
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
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={handleCategoryBlur}
              placeholder="Ej: Supermercado"
              required
              className="w-full"
              autoComplete="off"
              onFocusCapture={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-accent capitalize text-sm"
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
