import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategorySummary, Transaction, Category, Account, Budget } from '@/types/finance';
import { Tag, Pencil, ChevronLeft, ChevronRight, Calendar, Trash2, LucideIcon, CheckCircle2, TrendingUp, TrendingDown, Minus, Wallet, PiggyBank } from 'lucide-react';
import * as Icons from 'lucide-react';
import { calculateCategoryHistory, formatCurrency, calculateMonthlyAverages } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { SmartPagination } from '@/components/SmartPagination';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import TransactionList from '@/components/TransactionList';

interface CategoryBreakdownProps {
  categories: CategorySummary[];
  type: 'income' | 'expense';
  isPending?: boolean;
  transactions?: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transactionId: string) => void;
  onConfirmTransaction?: (transaction: Transaction) => void;
  categoryCatalog?: Category[];
  selectedAccount?: string;
  baseDate?: Date;
  accounts?: Account[];
  budgets?: Budget[];
}

const ITEMS_PER_PAGE = 5;


const CategoryBreakdown = ({
  categories,
  type,
  isPending = false,
  transactions = [],
  onEditTransaction,
  onDeleteTransaction,
  onConfirmTransaction,
  categoryCatalog = [],
  selectedAccount = 'total',
  baseDate = new Date(),
  accounts = [],
  budgets = [],
}: CategoryBreakdownProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const navigate = useNavigate();

  const now = new Date();
  const today = now.getDate();
  const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const [allAverages, setAllAverages] = useState<{category: string, average: number}[]>([]);
  const [isCalculatingAverages, setIsCalculatingAverages] = useState(true);

  useEffect(() => {
    setIsCalculatingAverages(true);
    const timeoutId = setTimeout(() => {
      const pastTransactions = transactions.filter(t => !t.date.startsWith(currentMonthKey));
      setAllAverages(calculateMonthlyAverages(pastTransactions));
      setIsCalculatingAverages(false);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [transactions, currentMonthKey]);

  // Pre-sort categories based on envelope available amount
  const sortedCategories = useMemo(() => {
    if (type !== 'expense' || budgets.length === 0) return categories;
    
    const viewedMonthStr = baseDate ? (baseDate.getFullYear() + '-' + String(baseDate.getMonth() + 1).padStart(2, '0')) : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
    
    return [...categories].sort((a, b) => {
      const aBudget = budgets.find(bg => bg.category === a.category && bg.month === viewedMonthStr);
      const bBudget = budgets.find(bg => bg.category === b.category && bg.month === viewedMonthStr);
      
      const aAvailable = aBudget ? aBudget.amount - a.total : null;
      const bAvailable = bBudget ? bBudget.amount - b.total : null;
      
      if (aAvailable !== null && bAvailable !== null) {
        if (aAvailable < 0 && bAvailable < 0) return aAvailable - bAvailable;
        if (aAvailable < 0) return -1;
        if (bAvailable < 0) return 1;
        return bAvailable - aAvailable;
      }
      if (aAvailable !== null) return -1;
      if (bAvailable !== null) return 1;
      return b.total - a.total;
    });
  }, [categories, budgets, type, baseDate]);

  const { paginatedCategories, totalPages } = useMemo(() => {
    const viewedMonthStr = baseDate ? (baseDate.getFullYear() + '-' + String(baseDate.getMonth() + 1).padStart(2, '0')) : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
    
    // Separamos los items que tienen presupuesto asignado activo (positivo o negativo) de los que están a cero
    const activeEnvItems = sortedCategories.filter(c => {
      if (type !== 'expense') return false;
      const b = budgets.find(bg => bg.category === c.category && bg.month === viewedMonthStr);
      if (!b) return false;
      return Number((b.amount - c.total).toFixed(2)) !== 0;
    });
    
    const zeroEnvItems = sortedCategories.filter(c => {
      if (type !== 'expense') return false;
      const b = budgets.find(bg => bg.category === c.category && bg.month === viewedMonthStr);
      if (!b) return false;
      return Number((b.amount - c.total).toFixed(2)) === 0;
    });

    const nonEnvItems = sortedCategories.filter(c => type !== 'expense' || !budgets.some(bg => bg.category === c.category && bg.month === viewedMonthStr));

    const chunkItems = (items: CategorySummary[]) => {
      if (items.length === 0) return [];
      const numPages = Math.max(1, Math.floor(items.length / ITEMS_PER_PAGE));
      const chunks = [];
      for (let i = 0; i < numPages; i++) {
        if (i === numPages - 1) {
          chunks.push(items.slice(i * ITEMS_PER_PAGE));
        } else {
          chunks.push(items.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
        }
      }
      return chunks;
    };

    const allPages = [...chunkItems(activeEnvItems), ...chunkItems(zeroEnvItems), ...chunkItems(nonEnvItems)];
    const finalTotalPages = Math.max(1, allPages.length);
    // If the currentPage gets out of bounds (e.g., due to deleting a category), default to the last page
    const safeCurrentPage = Math.min(currentPage, finalTotalPages);
    
    return {
        totalPages: finalTotalPages,
        paginatedCategories: allPages[safeCurrentPage - 1] || []
    };
  }, [sortedCategories, budgets, baseDate, currentPage, type]);

  if (categories.length === 0) {
    return null;
  }

  const title = isPending
    ? (type === 'expense' ? 'Gastos Futuros' : 'Ingresos Futuros')
    : (type === 'expense' ? 'Gastos por Categoría' : 'Ingresos por Categoría');
  const colorClass = type === 'expense' ? 'text-expense' : 'text-income';
  const bgClass = type === 'expense' ? 'bg-expense-light' : 'bg-income-light';
  const borderClass = type === 'expense' ? 'border-expense/20' : 'border-income/20';

  // For pending: show individual transactions sorted by date
  if (isPending) {
    const pendingItems = transactions
      .filter(t => t.type === type && t.isPending)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalPages = Math.max(1, Math.floor(pendingItems.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    const isLastPage = safeCurrentPage === totalPages;
    const paginatedItems = pendingItems.slice(startIndex, isLastPage ? pendingItems.length : startIndex + ITEMS_PER_PAGE);
    const pendingTotal = pendingItems.reduce((sum, t) => sum + t.amount, 0);

    if (pendingItems.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <Tag className="w-5 h-5" />
          {title}
          <span className={`ml-1 text-sm font-bold px-2 py-0.5 rounded-full ${type === 'expense' ? 'bg-expense-light text-expense' : 'bg-income-light text-income'}`}>
            {formatCurrency(pendingTotal)}
          </span>
        </h3>
        <div className={`grid grid-cols-1 ${!isPending ? 'sm:grid-cols-2 2xl:grid-cols-3' : ''} gap-3`}>
          {paginatedItems.map((transaction) => (
            <Card
              key={transaction.id}
              className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const catObj = categoryCatalog.find(c => c.name === transaction.category);
                      if (catObj?.customIcon) {
                        return (
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-border/20 bg-muted"
                          >
                            <img src={catObj.customIcon} className="w-full h-full object-cover" alt={catObj.name} />
                          </div>
                        );
                      }
                      const IconComponent = (catObj?.icon && (Icons as any)[catObj.icon]) || Icons.Tag;
                      return (
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                          style={{ backgroundColor: catObj?.color || (type === 'expense' ? '#ef4444' : '#10b981') }}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground capitalize truncate">{transaction.category}</p>
                        {onConfirmTransaction && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirmTransaction(transaction);
                            }}
                            className="text-income hover:scale-125 transition-transform duration-200 focus:outline-none"
                            title="Confirmar transacción (pasar a real)"
                          >
                            <CheckCircle2 className="w-5 h-5 fill-income/10" />
                          </button>
                        )}
                      </div>
                      {transaction.description && (
                        <p className="text-[10px] text-muted-foreground italic truncate mt-0.5">
                          {transaction.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-wider flex-wrap">
                        <Calendar className="w-3 h-3" />
                        {new Date(transaction.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        <span className="opacity-40">|</span>
                        {(() => {
                           const account = accounts.find(a => a.id === transaction.accountId);
                           if (account?.logo) {
                             return <img src={account.logo} alt="" className="w-3 h-3 ml-0.5 rounded-full object-cover bg-white" />;
                           }
                           return <Wallet className="w-3 h-3 ml-0.5" />;
                        })()}
                        <span className="truncate max-w-[80px]">
                          {accounts.find(a => a.id === transaction.accountId)?.name || 'Cuenta'}
                        </span>
                      </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className={`text-lg font-bold ${colorClass} whitespace-nowrap leading-none mt-1`}>
                    {formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex items-center gap-1">
                    {onEditTransaction && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditTransaction(transaction)}
                        className="h-8 w-8 hover:bg-background/50 text-muted-foreground"
                        aria-label={`Editar ${transaction.category}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeleteTransaction && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteTransaction(transaction.id)}
                        className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar ${transaction.category}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <SmartPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    );
  }




  // Get transactions for a specific category
  const getTransactionsForCategory = (categoryName: string): Transaction[] => {
    const targetMonthStr = baseDate.getFullYear() + '-' + String(baseDate.getMonth() + 1).padStart(2, '0');
    return transactions.filter(t =>
      t.type === type &&
      t.category.toLowerCase() === categoryName.toLowerCase() &&
      !t.isPending &&
      t.date.startsWith(targetMonthStr)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Tag className="w-5 h-5" />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
        {paginatedCategories.map((category, index) => {
          const catHistory = calculateCategoryHistory(transactions, category.category, type, 6, selectedAccount, baseDate);
          const chartColor = type === 'expense' ? '#ef4444' : '#22c55e';
          
          const lastMonthData = catHistory.length >= 2 ? catHistory[catHistory.length - 2] : null;
          
          let compValue = 0;
          let categoryTrend: number | null = null;
          let isActuallyNew = false;
          
          if (lastMonthData && (lastMonthData.totalUpToDay > 0 || lastMonthData.total > 0)) {
            // Priority 1: Use same day last month or total last month if no same-day data but month had data
            compValue = lastMonthData.totalUpToDay > 0 ? lastMonthData.totalUpToDay : lastMonthData.total;
            categoryTrend = ((category.total - compValue) / compValue) * 100;
          } else {
            // Priority 2: Use MEDIAS (Averages) scaled to today
            const avgData = allAverages.find(a => a.category.toLowerCase() === category.category.toLowerCase());
            if (avgData && avgData.average > 0) {
              compValue = (avgData.average / daysInMonth) * today;
              categoryTrend = ((category.total - compValue) / (compValue || 1)) * 100;
            } else {
              // Priority 3: Check if category existed before this month
              const hasOldTransactions = transactions.some(t => 
                t.category.toLowerCase() === category.category.toLowerCase() && 
                !t.date.startsWith(currentMonthKey)
              );
              if (!hasOldTransactions && category.total > 0) {
                isActuallyNew = true;
                categoryTrend = 999999; 
              }
            }
          }

          return (
            <Card
              key={index}
              onClick={() => setSelectedCategoryName(category.category)}
              className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all cursor-pointer active:scale-[0.98]`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {(() => {
                    const catObj = categoryCatalog.find(c => c.name === category.category);
                    if (catObj?.customIcon) {
                      return (
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-border/20 bg-muted"
                        >
                          <img src={catObj.customIcon} className="w-full h-full object-cover" alt={catObj.name} />
                        </div>
                      );
                    }
                    const IconComponent = (catObj?.icon && (Icons as any)[catObj.icon]) || Icons.Tag;
                    return (
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                        style={{ backgroundColor: catObj?.color || (type === 'expense' ? '#ef4444' : '#10b981') }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <div className="min-w-0 overflow-hidden">
                    <p className="font-bold text-foreground capitalize truncate">{category.category}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                      {category.count} {category.count === 1 ? 'transacción' : 'transacciones'}
                    </p>
                    
                    {/* Envelope Indicator */}
                    {(() => {
                      if (type !== 'expense' || budgets.length === 0) return null;
                      
                      const viewedMonthStr = baseDate ? (baseDate.getFullYear() + '-' + String(baseDate.getMonth() + 1).padStart(2, '0')) : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
                      const totalAssigned = budgets.filter(b => b.category === category.category && b.month === viewedMonthStr).reduce((sum, b) => sum + b.amount, 0);
                      
                      if (totalAssigned === 0) return null; // No budget assigned for this month
                      
                      const available = totalAssigned - category.total;
                      const availableRounded = Number(available.toFixed(2));
                      
                      return (
                        <div className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded-full text-[9px] font-black tracking-wider uppercase",
                          availableRounded > 0 ? "bg-income/10 text-income" :
                          availableRounded < 0 ? "bg-destructive/10 text-destructive" :
                          "bg-muted text-muted-foreground"
                        )}>
                          <PiggyBank className="w-2.5 h-2.5" />
                          <span>{formatCurrency(available)} en Sobre</span>
                        </div>
                      );
                    })()}

                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/10">

                  {type === 'expense' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/presupuestos?category=${encodeURIComponent(category.category)}`);
                      }}
                      title="Modificar sobre en presupuestos"
                    >
                      <PiggyBank className="w-4 h-4" />
                    </Button>
                  )}

                  <div className="flex flex-col items-end min-w-[70px]">
                    <p className={`text-lg font-bold ${colorClass} whitespace-nowrap leading-none`}>
                      {formatCurrency(category.total)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <SmartPagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {selectedCategoryName && (
        <ResponsiveDialog open={true} onOpenChange={(open) => !open && setSelectedCategoryName(null)}>
          <ResponsiveDialogContent className="max-h-[90vh] overflow-hidden flex flex-col p-0">
            <ResponsiveDialogHeader className="px-6 pt-6 pb-2 shrink-0">
              <ResponsiveDialogTitle className="text-2xl flex items-center gap-2 capitalize">
                <Tag className={`w-6 h-6 ${colorClass}`} />
                {selectedCategoryName}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
              <TransactionList 
                transactions={getTransactionsForCategory(selectedCategoryName)}
                onEdit={(t) => {
                  setSelectedCategoryName(null);
                  if (onEditTransaction) onEditTransaction(t);
                }}
                onDelete={(id) => {
                  if (onDeleteTransaction) onDeleteTransaction(id);
                }}
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}
    </div>
  );
};

export default CategoryBreakdown;
