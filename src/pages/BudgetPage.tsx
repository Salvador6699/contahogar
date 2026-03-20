import { useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Pencil, Trash2, PiggyBank, ChevronLeft, ChevronRight, Wand2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Budget, Transaction } from '@/types/finance';
import { loadData } from '@/lib/storage';
import { loadBudgets, saveBudget, updateBudget, deleteBudget } from '@/lib/budgetStorage';
import { formatCurrency, calculateTotalIncome, calculateTotalExpenses, calculateMonthlyAverages, CategoryMonthlyAverage } from '@/lib/calculations';
import { getCategorySuggestions } from '@/lib/storage';
import MobileNav from '@/components/MobileNav';
import { useScrollOnFocus } from '@/hooks/useScrollOnFocus';
import { withKeyboardClose } from '@/lib/utils';

const BudgetPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scrollOnFocus = useScrollOnFocus(240);
  const monthParam = searchParams.get('month') || format(new Date(), 'yyyy-MM');

  const [data, setData] = useState(loadData());
  const [budgets, setBudgets] = useState<Budget[]>(loadBudgets(monthParam));
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [includePendingIncome, setIncludePendingIncome] = useState(false);
  const [includePendingExpenses, setIncludePendingExpenses] = useState(false);

  const changeMonth = (direction: 'prev' | 'next') => {
    const current = parseISO(monthParam + '-01');
    const newMonth = direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1);
    const newKey = format(newMonth, 'yyyy-MM');
    setSearchParams({ month: newKey });
    setBudgets(loadBudgets(newKey));
    handleCancel();
  };

  const monthLabel = useMemo(() => {
    const date = parseISO(monthParam + '-01');
    return format(date, 'MMMM yyyy', { locale: es });
  }, [monthParam]);

  // Filter transactions for this month, excluding transfers
  const monthTransactions = useMemo(() => {
    return data.transactions.filter(t => {
      const tMonth = t.date.substring(0, 7);
      return tMonth === monthParam && t.category !== 'Transferencia';
    });
  }, [data.transactions, monthParam]);

  const totalIncome = calculateTotalIncome(monthTransactions, undefined, includePendingIncome);
  const totalExpenses = calculateTotalExpenses(monthTransactions, undefined, includePendingExpenses);

  const averages = useMemo(() => calculateMonthlyAverages(data.transactions), [data.transactions]);
  
  const currentAverage = useMemo(() => {
    if (!category.trim()) return null;
    return averages.find(a => a.category.toLowerCase().trim() === category.toLowerCase().trim());
  }, [averages, category]);

  const handleFillFromAverages = () => {
    // Get user-selected categories from localStorage (same as AveragesPage)
    const saved = localStorage.getItem('contahogar_selected_averages');
    let selectedSet: Record<string, boolean> = {};
    if (saved) {
      try {
        selectedSet = JSON.parse(saved);
      } catch (e) {}
    }

    // Fill only expenses that are selected in the Averages page
    const filteredAverages = averages.filter(a => {
      // If we have saved preferences, use them. Otherwise fallback to isRegular.
      const isSelected = saved ? selectedSet[a.category] : a.isRegular;
      return a.type === 'expense' && isSelected;
    });

    const existingCategories = new Set(budgets.map(b => b.category.toLowerCase().trim()));
    
    filteredAverages.forEach(avg => {
      if (!existingCategories.has(avg.category.toLowerCase().trim())) {
        const newBudget: Budget = {
          id: `${Date.now()}-${Math.random()}`,
          category: avg.category.trim(),
          amount: avg.average,
          month: monthParam,
        };
        saveBudget(newBudget);
      }
    });

    setBudgets(loadBudgets(monthParam));
  };

  const getSpentForCategory = (cat: string): number => {
    return monthTransactions
      .filter(t => t.type === 'expense' && (!t.isPending || includePendingExpenses) && t.category.toLowerCase().trim() === cat.toLowerCase().trim())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleCategoryInput = (value: string) => {
    setCategory(value);
    if (value.length > 0) {
      setSuggestions(getCategorySuggestions(value, data.categories));
    } else {
      setSuggestions([]);
    }
  };

  const handleSave = () => {
    if (!category.trim() || !amount || parseFloat(amount) <= 0) return;

    if (editingBudget) {
      const updated: Budget = { ...editingBudget, category: category.trim(), amount: parseFloat(amount) };
      updateBudget(updated);
      setEditingBudget(null);
    } else {
      const budget: Budget = {
        id: `${Date.now()}-${Math.random()}`,
        category: category.trim(),
        amount: parseFloat(amount),
        month: monthParam,
      };
      saveBudget(budget);
    }

    setBudgets(loadBudgets(monthParam));
    setCategory('');
    setAmount('');
    setShowForm(false);
    setSuggestions([]);
  };

  const formRef = useRef<HTMLDivElement>(null);

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setAmount(budget.amount.toString());
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAddClick = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = (id: string) => {
    deleteBudget(id);
    setBudgets(loadBudgets(monthParam));
  };

  const handleCancel = () => {
    setEditingBudget(null);
    setCategory('');
    setAmount('');
    setShowForm(false);
    setSuggestions([]);
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + getSpentForCategory(b.category), 0);

  return (
    <div className="min-h-screen app-gradient-bg pb-32 lg:pl-20">
      <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <PiggyBank className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Presupuestos</h1>
              </div>
            </div>
          </div>
          {/* Month navigator */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <p className="text-sm font-medium text-primary capitalize min-w-[140px] text-center">{monthLabel}</p>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Ingresos del mes</p>
              <p className="text-lg font-bold text-income">{formatCurrency(totalIncome)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="include-pending-income"
                  checked={includePendingIncome}
                  onCheckedChange={(checked) => setIncludePendingIncome(!!checked)}
                />
                <label
                  htmlFor="include-pending-income"
                  className="text-xs text-muted-foreground cursor-pointer leading-tight"
                >
                  Incluir ingresos previstos
                </label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total presupuestado</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalBudgeted)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="include-pending-expenses"
                  checked={includePendingExpenses}
                  onCheckedChange={(checked) => setIncludePendingExpenses(!!checked)}
                />
                <label
                  htmlFor="include-pending-expenses"
                  className="text-xs text-muted-foreground cursor-pointer leading-tight"
                >
                  Incluir gastos previstos
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remaining from income */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Disponible sin presupuestar</p>
              <p className={`text-lg font-bold ${totalIncome - totalBudgeted >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(totalIncome - totalBudgeted)}
              </p>
            </div>
            <Progress
              value={totalBudgeted > 0 ? Math.min((totalBudgeted / totalIncome) * 100, 100) : 0}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        {/* Add Budget Button and Autocomplete */}
        {!showForm && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button onClick={handleAddClick} className="flex-1 gap-2">
              <Plus className="w-4 h-4" />
              Añadir presupuesto
            </Button>
            {budgets.length === 0 && averages.some(a => a.type === 'expense' && a.isRegular) && (
              <Button onClick={handleFillFromAverages} variant="outline" className="flex-1 gap-2 border-primary/20 text-primary hover:bg-primary/5">
                <Wand2 className="w-4 h-4" />
                Autocompletar con medias
              </Button>
            )}
          </div>
        )}

        {/* Budget Form */}
        {showForm && (
          <Card ref={formRef} className="mb-6 border-primary/20 shadow-md scroll-mt-20">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input
                  value={category}
                  onChange={e => handleCategoryInput(e.target.value)}
                  placeholder="Ej: Alimentación"
                  onFocus={scrollOnFocus}
                />
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestions.slice(0, 5).map(s => (
                      <button
                        key={s}
                        onClick={() => withKeyboardClose(() => {
                          setCategory(s);
                          setSuggestions([]);
                        })}
                        onPointerDown={() => withKeyboardClose(() => {
                          setCategory(s);
                          setSuggestions([]);
                        })}
                        className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Presupuesto (€)</Label>
                  {currentAverage && (
                    <button 
                      onClick={() => setAmount(currentAverage.average.toString())}
                      className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <Info className="w-3 h-3" />
                      Media: {formatCurrency(currentAverage.average)}
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onFocus={scrollOnFocus}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => withKeyboardClose(() => handleSave())}
                  onPointerDown={() => withKeyboardClose(() => handleSave())}
                  className="flex-1"
                >
                  {editingBudget ? 'Guardar' : 'Añadir'}
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Cards */}
        <div className="space-y-3 pb-8">
          {budgets.map(budget => {
            const spent = getSpentForCategory(budget.category);
            const remaining = budget.amount - spent;
            const progress = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
            const isOverBudget = spent > budget.amount;

            return (
              <Card key={budget.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground capitalize">{budget.category}</p>
                      <p className="text-xs text-muted-foreground">
                        Presupuesto: {formatCurrency(budget.amount)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(budget)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(budget.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Progress
                    value={progress}
                    className={`h-3 mb-2 ${isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-income'}`}
                  />

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Gastado: <span className="text-expense font-medium">{formatCurrency(spent)}</span>
                    </span>
                    <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-income'}`}>
                      {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(remaining))} {isOverBudget ? 'excedido' : 'restante'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {budgets.length === 0 && !showForm && (
            <div className="text-center py-12">
              <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay presupuestos para este mes.</p>
              <p className="text-muted-foreground text-sm mt-1">Añade uno para controlar tus gastos.</p>
            </div>
          )}
        </div>
      </div>
      <MobileNav />
    </div>
  );
};

export default BudgetPage;
