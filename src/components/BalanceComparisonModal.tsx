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
import { formatCurrency, calculateAccountBalance } from '@/lib/calculations';
import { getCategorySuggestions, loadData } from '@/lib/storage';
import { AlertCircle, CheckCircle, TrendingDown, TrendingUp, Plus, Minus, Trash2, Save } from 'lucide-react';
import { Transaction, Account } from '@/types/finance';

interface BalanceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSaveAdjustments: (transactions: Omit<Transaction, 'id'>[]) => void;
}

interface Adjustment {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
}

const BalanceComparisonModal = ({
  isOpen,
  onClose,
  categories,
  onSaveAdjustments,
}: BalanceComparisonModalProps) => {
  const [data, setData] = useState(loadData());
  const [activeAccountId, setActiveAccountId] = useState('');
  const [realBalances, setRealBalances] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment[]>>({});
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize with first account and data on modal open
  useEffect(() => {
    if (isOpen) {
      const loadedData = loadData();
      setData(loadedData);
      if (loadedData.accounts.length > 0 && !activeAccountId) {
        setActiveAccountId(loadedData.accounts[0].id);
      }
    }
  }, [isOpen]);

  // Update suggestions when category is typed
  useEffect(() => {
    if (newCategory.trim()) {
      const filteredSuggestions = getCategorySuggestions(newCategory, data.categories).slice(0, 5);
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [newCategory, data.categories]);

  const handleClose = () => {
    setRealBalances({});
    setAdjustments({});
    setNewAmount('');
    setNewCategory('');
    setShowSuggestions(false);
    onClose();
  };

  const currentAccount = data.accounts.find(a => a.id === activeAccountId);
  const currentBalance = currentAccount ? calculateAccountBalance(currentAccount, data.transactions) : 0;
  const realBalance = realBalances[activeAccountId] || '';

  const addAdjustment = (type: 'income' | 'expense') => {
    const amount = parseFloat(newAmount);
    if (amount > 0 && newCategory.trim() && activeAccountId) {
      const adjustment: Adjustment = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        amount,
        category: newCategory.trim(),
      };
      setAdjustments(prev => ({
        ...prev,
        [activeAccountId]: [...(prev[activeAccountId] || []), adjustment],
      }));
      setNewAmount('');
      setNewCategory('');
      setShowSuggestions(false);
    }
  };

  const removeAdjustment = (id: string) => {
    setAdjustments(prev => ({
      ...prev,
      [activeAccountId]: (prev[activeAccountId] || []).filter(a => a.id !== id),
    }));
  };

  const selectSuggestion = (suggestion: string) => {
    setNewCategory(suggestion);
    setShowSuggestions(false);
  };

  const handleCategoryBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSaveAdjustments = () => {
    const today = new Date().toISOString().split('T')[0];
    const allAdjustments = [];

    Object.entries(adjustments).forEach(([accountId, accts]) => {
      accts.forEach(adj => {
        allAdjustments.push({
          date: today,
          amount: adj.amount,
          category: adj.category,
          type: adj.type as 'income' | 'expense',
          accountId: accountId,
          isPending: false,
        });
      });
    });

    if (allAdjustments.length > 0) {
      onSaveAdjustments(allAdjustments);
    }
    handleClose();
  };

  const totalAdjustments = (adjustments[activeAccountId] || []).reduce((sum, adj) => {
    return adj.type === 'income' ? sum + adj.amount : sum - adj.amount;
  }, 0);

  const adjustedBalance = currentBalance + totalAdjustments;
  const realBalanceNum = parseFloat(realBalance) || 0;
  const difference = realBalanceNum - adjustedBalance;
  const hasDifference = Math.abs(difference) > 0.01;
  const isTabBalanced = realBalance !== '' && !hasDifference;

  // Summary data for all accounts
  const summaryData = data.accounts.map(account => {
    const adj = (adjustments[account.id] || []).reduce((s, a) => a.type === 'income' ? s + a.amount : s - a.amount, 0);
    const balance = calculateAccountBalance(account, data.transactions);
    const real = parseFloat(realBalances[account.id] || '0') || 0;
    return {
      accountId: account.id,
      isBalanced: realBalances[account.id] !== '' && Math.abs(real - (balance + adj)) < 0.01,
      hasAdjustments: (adjustments[account.id] || []).length > 0,
    };
  });

  const hasAnyAdjustments = Object.values(adjustments).some(adj => adj.length > 0);
  const atLeastOneBalanced = summaryData.some(s => s.isBalanced && s.hasAdjustments);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Cuadrar Saldo
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Account tabs */}
          <div className="flex gap-2 flex-wrap">
            {data.accounts.map(account => {
              const accountSummary = summaryData.find(s => s.accountId === account.id);
              return (
                <Button
                  key={account.id}
                  variant={activeAccountId === account.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveAccountId(account.id)}
                  className="flex items-center gap-2"
                >
                  {account.name}
                  {accountSummary?.isBalanced && accountSummary?.hasAdjustments && (
                    <CheckCircle className="w-3 h-3 text-income" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Current balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Saldo App</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(currentBalance)}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Saldo Ajustado</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(adjustedBalance)}
              </p>
            </div>
          </div>

          {/* Real balance input */}
          <div className="space-y-2">
            <Label htmlFor="realBalance">
              Tu saldo real ({currentAccount?.name || 'Cuenta'})
            </Label>
            <div className="flex gap-2">
              <Input
                id="realBalance"
                type="number"
                step="0.01"
                value={realBalance}
                onChange={(e) => setRealBalances(prev => ({ ...prev, [activeTab]: e.target.value }))}
                placeholder="0.00"
                className="flex-1"
              />
              <span className="flex items-center text-muted-foreground">€</span>
            </div>
          </div>

          {/* Difference indicator */}
          {realBalance && (
            <div className={`p-3 rounded-lg border-2 ${
              hasDifference 
                ? 'bg-expense-light border-expense/30' 
                : 'bg-income-light border-income/30'
            }`}>
              {hasDifference ? (
                <div className="flex items-center gap-2">
                  {difference > 0 ? (
                    <TrendingUp className="w-5 h-5 text-income flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-expense flex-shrink-0" />
                  )}
                  <p className="text-sm">
                    {difference > 0 ? (
                      <>Faltan <span className="font-bold text-income">{formatCurrency(difference)}</span> de ingresos</>
                    ) : (
                      <>Faltan <span className="font-bold text-expense">{formatCurrency(Math.abs(difference))}</span> de gastos</>
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-income" />
                  <p className="font-semibold text-income text-sm">¡Saldo cuadrado!</p>
                </div>
              )}
            </div>
          )}

          {/* Add adjustments */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Añadir ajustes para cuadrar</p>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={handleCategoryBlur}
                  placeholder="Categoría (ej: Supermercado)"
                  className="text-sm"
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-32 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-accent capitalize text-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="Importe"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => addAdjustment('income')}
                  disabled={!newAmount || parseFloat(newAmount) <= 0 || !newCategory.trim()}
                  className="bg-income-light hover:bg-income/20 border-income/30"
                  title="Añadir ingreso"
                >
                  <Plus className="w-4 h-4 text-income" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => addAdjustment('expense')}
                  disabled={!newAmount || parseFloat(newAmount) <= 0 || !newCategory.trim()}
                  className="bg-expense-light hover:bg-expense/20 border-expense/30"
                  title="Añadir gasto"
                >
                  <Minus className="w-4 h-4 text-expense" />
                </Button>
              </div>
            </div>

            {/* Adjustments list */}
            {(adjustments[activeAccountId] || []).length > 0 && (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {(adjustments[activeAccountId] || []).map((adj) => (
                  <div
                    key={adj.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                      adj.type === 'income' ? 'bg-income-light' : 'bg-expense-light'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {adj.type === 'income' ? (
                        <Plus className="w-4 h-4 text-income flex-shrink-0" />
                      ) : (
                        <Minus className="w-4 h-4 text-expense flex-shrink-0" />
                      )}
                      <span className="truncate capitalize">{adj.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${adj.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {adj.type === 'income' ? '+' : '-'}{formatCurrency(adj.amount)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAdjustment(adj.id)}
                        className="h-7 w-7 hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cerrar
            </Button>
            {hasAnyAdjustments && atLeastOneBalanced && (
              <Button
                type="button"
                onClick={handleSaveAdjustments}
                className="flex-1 bg-income hover:bg-income/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            )}
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default BalanceComparisonModal;
