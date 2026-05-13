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
import { Calendar, DollarSign, Tag, Building2, Banknote, Clock, MessageSquare, ChevronDown } from 'lucide-react';
import { useScrollOnFocus } from '@/hooks/useScrollOnFocus';
import { withKeyboardClose } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, copyToNextMonth?: boolean, recurringOptions?: { frequency: string; intervalMonths?: number; endAfterMonths?: number }) => void;
  type: TransactionType;
  categories: (string | Category)[];
  editingTransaction?: Transaction | null;
  defaultAccountId?: string;
}

import { cn } from '@/lib/utils';

const TransactionModal = ({
  isOpen,
  onClose,
  onSave,
  type,
  categories,
  editingTransaction = null,
  defaultAccountId = '',
}: TransactionModalProps) => {
  const scrollOnFocus = useScrollOnFocus(240);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [copyToNextMonth, setCopyToNextMonth] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [intervalMonths, setIntervalMonths] = useState(1);
  const [endAfterMonths, setEndAfterMonths] = useState<number | undefined>(undefined); // undefined = indefinido
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [step, setStep] = useState<'account' | 'form'>('account');
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    if (isOpen && !editingTransaction) {
      const draft = sessionStorage.getItem(`transactionDraft_${type}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.amount) setAmount(parsed.amount);
          if (parsed.category) setCategory(parsed.category);
          if (parsed.description) setDescription(parsed.description);
        } catch (e) {}
      }
    }
  }, [isOpen, editingTransaction, type]);

  useEffect(() => {
    if (isOpen && !editingTransaction) {
      if (amount || category || description) {
        sessionStorage.setItem(`transactionDraft_${type}`, JSON.stringify({ amount, category, description }));
      }
    }
  }, [amount, category, description, isOpen, editingTransaction, type]);

  useEffect(() => {
    if (isOpen) {
      // Load accounts from storage
      const data = loadData();
      setAccounts(data.accounts);
      
      // Determine the absolute fallback account
      const firstAvailableAccount = data.accounts.length > 0 ? data.accounts[0].id : '';
      const contextualDefault = defaultAccountId || firstAvailableAccount;

      if (data.accounts.length <= 1) {
        setStep('form');
      } else {
        setStep('account');
      }

      if (editingTransaction) {
        // Editing mode - populate with existing data
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toString());
        setCategory(editingTransaction.category);
        setDescription(editingTransaction.description || '');
        
        // Priority: 1. Transacc account, 2. Global Default
        setAccountId(editingTransaction.accountId || contextualDefault);
        
        setIsPending(editingTransaction.isPending || false);
        setCopyToNextMonth(false);
      } else {
        // New transaction - set today's date
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setAmount('');
        setCategory('');
        setDescription('');
        setAccountId(contextualDefault);
        setIsPending(false);
        setCopyToNextMonth(false);
        setIsRecurring(false);
        setIntervalMonths(1);
        setEndAfterMonths(undefined);
      }
    }
  }, [isOpen, editingTransaction, defaultAccountId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (category) {
        const filtered = getCategorySuggestions(category, categories);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0 && category.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [category, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!accountId) {
      toast.error('Por favor, selecciona una cuenta antes de guardar.');
      return;
    }

    if (!date || !amount || !category) {
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    setIsSubmitting(true);

    // Check for similar category and use existing one if found
    const existingCategory = findSimilarCategory(category, categories) || category;

    onSave(
      { date, amount: amountNum, category: existingCategory, type, accountId, isPending, description },
      copyToNextMonth,
      isRecurring
        ? { frequency: 'every_n_months', intervalMonths, endAfterMonths }
        : undefined
    );

    // Clear draft
    sessionStorage.removeItem(`transactionDraft_${type}`);

    // Reset form only if not editing
    if (!editingTransaction) {
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setCategory('');
      setDescription('');
      // No reseteamos setAccountId para que recuerde la última cuenta seleccionada
      setIsPending(false);
      setCopyToNextMonth(false);
      setIsRecurring(false);
      setIntervalMonths(1);
      setEndAfterMonths(undefined);
      setShowAdvancedOptions(false);
      setShowAllCategories(false);
    }
    setSuggestions([]);
    setShowSuggestions(false);

    setTimeout(() => setIsSubmitting(false), 300);
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
        
        {step === 'account' ? (
          <div className="py-6 space-y-6">
            <p className="text-center text-muted-foreground text-lg font-medium">
              ¿En qué cuenta quieres registrar este {type === 'expense' ? 'gasto' : 'ingreso'}?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setAccountId(acc.id);
                    setStep('form');
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 bg-card shadow-sm",
                    accountId === acc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                >
                  {acc.logo ? (
                    <img src={acc.logo} alt={acc.name} className="w-10 h-10 object-contain drop-shadow-sm rounded-sm" />
                  ) : (
                    <Building2 className={cn("w-10 h-10", accountId === acc.id ? "text-primary" : "text-muted-foreground")} />
                  )}
                  <span className="font-bold text-lg">{acc.name}</span>
                </button>
              ))}
            </div>
            {editingTransaction && (
              <Button type="button" variant="outline" className="w-full mt-4 h-12" onClick={() => setStep('form')}>
                Continuar con cuenta actual
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
            {accounts.length > 1 && (
              <div className="flex justify-between items-center bg-muted/30 px-4 py-3 rounded-xl border border-border/50 mb-4 mx-1">
                <div className="flex items-center gap-2">
                  {accounts.find(a => a.id === accountId)?.logo ? (
                    <img src={accounts.find(a => a.id === accountId)?.logo} alt="Logo" className="w-5 h-5 object-contain rounded-sm" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-muted-foreground">
                    Cuenta: <span className="font-bold text-foreground">{accounts.find(a => a.id === accountId)?.name}</span>
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStep('account')} 
                  className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded-md bg-primary/10"
                >
                  Cambiar
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-1 space-y-5 custom-scrollbar pb-4 flex-1">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2 text-lg font-bold">
                <DollarSign className="w-5 h-5 text-primary" />
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
                className="w-full text-2xl h-14"
                onFocus={scrollOnFocus}
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoría
              </Label>
              <div className="relative">
                <Input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (showAllCategories) setShowAllCategories(false);
                  }}
                  placeholder="Ej: Supermercado"
                  required
                  className="w-full h-12 pr-12"
                  autoComplete="off"
                  onFocus={scrollOnFocus}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowAllCategories(!showAllCategories);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors bg-background rounded-full"
                >
                  <ChevronDown className={cn("w-6 h-6 transition-transform", showAllCategories ? "rotate-180" : "")} />
                </button>
              </div>

              {showAllCategories && categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto custom-scrollbar p-3 border border-border/50 rounded-xl bg-muted/10 animate-in fade-in zoom-in-95 duration-200">
                  {categories.map((cat, index) => {
                    const catName = typeof cat === 'string' ? cat : cat.name;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => withKeyboardClose(() => {
                          selectSuggestion(catName);
                          setShowAllCategories(false);
                        })}
                        className="px-4 py-2 text-sm font-medium rounded-xl bg-background border border-border hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95"
                      >
                        {catName}
                      </button>
                    );
                  })}
                </div>
              )}

              {!showAllCategories && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestions.slice(0, 6).map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => withKeyboardClose(() => selectSuggestion(suggestion))}
                      className="min-h-[44px] px-4 py-2 text-sm rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all border border-border font-medium shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notas / Detalles (Opcional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Compra del domingo..."
                className="w-full h-20 bg-background/50"
                onFocus={scrollOnFocus}
              />
            </div>

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
                className="w-full h-12"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-sm font-bold text-primary flex items-center gap-2 py-2 px-3 bg-primary/5 rounded-lg w-full justify-center active:scale-95 transition-all"
              >
                {showAdvancedOptions ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas (Pago futuro o recurrente)'}
              </button>
            </div>

            {showAdvancedOptions && (
              <div className="space-y-5 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/40">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPending"
                      checked={isPending}
                      onChange={(e) => setIsPending(e.target.checked)}
                      className="w-5 h-5 rounded border-input accent-primary"
                    />
                    <Label htmlFor="isPending" className="cursor-pointer text-base font-medium">
                      Es un pago futuro (no cobrado aún)
                    </Label>
                  </div>
                  
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="isRecurring"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-5 h-5 rounded border-input accent-primary"
                      />
                      <Label htmlFor="isRecurring" className="cursor-pointer text-base font-bold text-primary flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Es un pago mensual o recurrente
                      </Label>
                    </div>

                    {isRecurring && (
                      <div className="pl-8 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Intervalo */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">¿Cada cuántos meses?</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="intervalMonths"
                              type="number"
                              min={1}
                              max={60}
                              value={intervalMonths}
                              onChange={(e) => setIntervalMonths(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-24 h-12 text-center text-lg font-bold"
                            />
                            <span className="text-sm font-medium text-muted-foreground">
                              {intervalMonths === 1 ? 'mes (mensual)' : `meses`}
                            </span>
                          </div>
                        </div>

                        {/* Duración */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">¿Durante cuánto tiempo?</Label>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEndAfterMonths(undefined)}
                              className={`text-sm px-4 py-2.5 rounded-xl border font-bold transition-all min-h-[44px] ${
                                endAfterMonths === undefined
                                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                              }`}
                            >
                              Indefinido
                            </button>
                            <button
                              type="button"
                              onClick={() => setEndAfterMonths(endAfterMonths ?? 12)}
                              className={`text-sm px-4 py-2.5 rounded-xl border font-bold transition-all min-h-[44px] ${
                                endAfterMonths !== undefined
                                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                              }`}
                            >
                              Límite de meses
                            </button>
                            {endAfterMonths !== undefined && (
                              <div className="flex items-center gap-2 w-full mt-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={360}
                                  value={endAfterMonths}
                                  onChange={(e) => setEndAfterMonths(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-24 h-12 text-center text-lg font-bold"
                                />
                                <span className="text-sm font-medium text-muted-foreground">meses</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 pb-2 mt-auto border-t border-border/30 bg-background/95 backdrop-blur-sm sticky bottom-0 z-20">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 text-base font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 h-14 text-base font-bold text-white shadow-lg ${buttonClass}`}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default TransactionModal;
