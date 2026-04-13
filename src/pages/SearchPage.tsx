import { useState, useEffect, useMemo } from 'react';
import { 
  Search as SearchIcon, 
  SlidersHorizontal, 
  Calendar, 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  Filter
} from 'lucide-react';
import { loadData, updateTransaction, deleteTransaction } from '@/lib/storage';
import { Transaction, Account, Category } from '@/types/finance';
import { filterTransactions, FilterCriteria, formatCurrency } from '@/lib/calculations';
import MobileNav from '@/components/MobileNav';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SearchPage = () => {
  const [data, setData] = useState(loadData());
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter State
  const [criteria, setCriteria] = useState<FilterCriteria>({
    query: '',
    startDate: '',
    endDate: '',
    categories: [],
    accounts: [],
    minAmount: undefined,
    maxAmount: undefined,
    type: 'all',
    includePending: true
  });

  useEffect(() => {
    setData(loadData());
  }, []);

  const results = useMemo(() => {
    return filterTransactions(data.transactions, criteria);
  }, [data.transactions, criteria]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setData(loadData());
    toast.success('Transacción eliminada');
  };

  const handleSave = (transaction: any) => {
    updateTransaction(transaction as Transaction);
    setData(loadData());
    setIsModalOpen(false);
    toast.success('Transacción actualizada');
  };

  const toggleCategory = (cat: string) => {
    setCriteria(prev => ({
      ...prev,
      categories: prev.categories?.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...(prev.categories || []), cat]
    }));
  };

  const toggleAccount = (accId: string) => {
    setCriteria(prev => ({
      ...prev,
      accounts: prev.accounts?.includes(accId)
        ? prev.accounts.filter(a => a !== accId)
        : [...(prev.accounts || []), accId]
    }));
  };

  const clearFilters = () => {
    setCriteria({
      query: '',
      startDate: '',
      endDate: '',
      categories: [],
      accounts: [],
      minAmount: undefined,
      maxAmount: undefined,
      type: 'all',
      includePending: true
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (criteria.startDate) count++;
    if (criteria.endDate) count++;
    if (criteria.categories?.length) count++;
    if (criteria.accounts?.length) count++;
    if (criteria.minAmount !== undefined) count++;
    if (criteria.maxAmount !== undefined) count++;
    if (criteria.type !== 'all') count++;
    return count;
  }, [criteria]);

  return (
    <div className="min-h-screen bg-background pb-32 pt-20 px-4 md:px-8 max-w-5xl mx-auto">
      <MobileNav />
      
      <div className="flex flex-col gap-6">
        {/* Search Header */}
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Buscar transacción..."
              className="pl-10 h-14 bg-card/50 backdrop-blur-sm border-border/10 rounded-2xl text-lg focus:ring-primary/20 transition-all font-medium"
              value={criteria.query}
              onChange={(e) => setCriteria(prev => ({ ...prev, query: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-10 rounded-xl gap-2 transition-all",
                showFilters || activeFiltersCount > 0 ? "border-primary text-primary bg-primary/5" : "text-muted-foreground"
              )}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 min-w-[20px] px-1 bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-muted-foreground hover:text-destructive h-8 px-2"
              >
                Limpiar todo
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="bg-card/40 backdrop-blur-md border border-border/10 rounded-3xl p-6 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Type Filter */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Tipo de Movimiento</Label>
              <div className="flex gap-2">
                {['all', 'income', 'expense'].map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={criteria.type === t ? 'default' : 'outline'}
                    onClick={() => setCriteria(prev => ({ ...prev, type: t as any }))}
                    className="flex-1 rounded-xl h-10 capitalize text-xs font-bold"
                  >
                    {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Dates */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Rango de Fechas
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    className="h-10 rounded-xl bg-background/50 text-xs"
                    value={criteria.startDate}
                    onChange={(e) => setCriteria(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <Input
                    type="date"
                    className="h-10 rounded-xl bg-background/50 text-xs"
                    value={criteria.endDate}
                    onChange={(e) => setCriteria(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Rango de Importe (€)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-10 rounded-xl bg-background/50 text-xs"
                    value={criteria.minAmount || ''}
                    onChange={(e) => setCriteria(prev => ({ ...prev, minAmount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-10 rounded-xl bg-background/50 text-xs"
                    value={criteria.maxAmount || ''}
                    onChange={(e) => setCriteria(prev => ({ ...prev, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Accounts */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" /> Cuentas
                </Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {data.accounts.map(acc => (
                    <Badge
                      key={acc.id}
                      variant={criteria.accounts?.includes(acc.id) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1.5 rounded-xl hover:scale-105 transition-all text-[10px]"
                      onClick={() => toggleAccount(acc.id)}
                    >
                      {acc.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" /> Categorías
                </Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {data.categories.map(cat => (
                    <Badge
                      key={typeof cat === 'string' ? cat : cat.id}
                      variant={criteria.categories?.includes(typeof cat === 'string' ? cat : cat.name) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1.5 rounded-xl hover:scale-105 transition-all text-[10px]"
                      onClick={() => toggleCategory(typeof cat === 'string' ? cat : cat.name)}
                    >
                      {typeof cat === 'string' ? cat : cat.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-border/10">
              <Checkbox 
                id="includePending" 
                checked={criteria.includePending}
                onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, includePending: !!checked }))}
                className="rounded-md"
              />
              <Label htmlFor="includePending" className="text-xs font-bold text-muted-foreground cursor-pointer">
                Incluir transacciones futuras/pendientes
              </Label>
            </div>
          </div>
        )}

        {/* Results Info */}
        <div className="flex justify-between items-center px-1">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            {results.length} resultados encontrados
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-income" />
              <span className="text-[10px] font-bold text-income">{formatCurrency(results.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0))}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-expense" />
              <span className="text-[10px] font-bold text-expense">{formatCurrency(results.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0))}</span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {results.length > 0 ? (
            <TransactionList 
              transactions={results}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4 bg-card/20 rounded-3xl border border-dashed border-border/20">
              <SearchIcon className="w-12 h-12 opacity-10" />
              <p className="font-bold text-sm tracking-tight">No hay movimientos que coincidan</p>
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        type={editingTransaction?.type || 'expense'}
        categories={data.categories}
        editingTransaction={editingTransaction}
      />
    </div>
  );
};

export default SearchPage;
