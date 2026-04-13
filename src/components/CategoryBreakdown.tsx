import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategorySummary, Transaction, Budget, Category } from '@/types/finance';
import { Tag, Pencil, ChevronLeft, ChevronRight, Calendar, Trash2, LucideIcon, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { calculateCategoryHistory, formatCurrency, calculateMonthlyAverages } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface CategoryBreakdownProps {
  categories: CategorySummary[];
  type: 'income' | 'expense';
  isPending?: boolean;
  transactions?: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transactionId: string) => void;
  onConfirmTransaction?: (transaction: Transaction) => void;
  budgets?: Budget[];
  categoryCatalog?: Category[];
  selectedAccount?: string;
  baseDate?: Date;
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
  budgets = [],
  categoryCatalog = [],
  selectedAccount,
  baseDate = new Date(),
}: CategoryBreakdownProps) => {
  const [currentPage, setCurrentPage] = useState(1);

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

    const totalPages = Math.ceil(pendingItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = pendingItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
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
        <div className="space-y-2">
          {paginatedItems.map((transaction) => (
            <Card
              key={transaction.id}
              className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 flex items-center gap-3">
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
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        {new Date(transaction.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${colorClass} whitespace-nowrap`}>
                    {formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex gap-1">
                    {onEditTransaction && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditTransaction(transaction)}
                        className="h-8 w-8 hover:bg-background/50"
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
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Non-pending: show grouped by category with date of each transaction
  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCategories = categories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Get transactions for a specific category
  const getTransactionsForCategory = (categoryName: string): Transaction[] => {
    return transactions.filter(t =>
      t.type === type &&
      t.category.toLowerCase() === categoryName.toLowerCase() &&
      !t.isPending
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const now = new Date();
  const today = now.getDate();
  const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const allAverages = useMemo(() => {
    // We calculate averages based ONLY on transactions BEFORE the current month 
    // to have a real historical reference.
    const pastTransactions = transactions.filter(t => !t.date.startsWith(currentMonthKey));
    return calculateMonthlyAverages(pastTransactions);
  }, [transactions, currentMonthKey]);

  // TrendBadge sub-component for category trend
  const TrendBadge = ({ value, isExpense = false, comparisonValue }: { value: number | null, isExpense?: boolean, comparisonValue?: number }) => {
    if (value === null) return null;
    const isUp = value > 0;
    const isNeutral = Math.abs(value) < 1;

    if (isNeutral) return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[8px] font-bold text-muted-foreground italic">
           vs {formatCurrency(comparisonValue || 0)}
        </span>
        <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
          <Minus className="w-2 h-2" />
          <span>0%</span>
        </div>
      </div>
    );

    // Special case for NEW categories (value SENTINEL = 999999)
    if (value === 999999) return (
      <div className="flex items-center gap-1 text-[8px] font-black text-income bg-income/10 px-1.5 py-0.5 rounded-full">
        <TrendingUp className="w-2 h-2" />
        <span>NUEVO</span>
      </div>
    );

    let colorClass = "";
    let Icon = isUp ? TrendingUp : TrendingDown;

    if (!isExpense) {
      colorClass = isUp ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10";
    } else {
      colorClass = isUp ? "text-red-500 bg-red-500/10" : "text-green-500 bg-green-500/10";
    }

    return (
      <div className="flex flex-col items-end gap-1">
        {comparisonValue !== undefined && (
          <span className={cn("text-[8px] font-bold italic", colorClass.split(' ')[0])}>
            vs {formatCurrency(comparisonValue)}
          </span>
        )}
        <div className={cn("flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full", colorClass)}>
          <Icon className="w-2 h-2" />
          <span>{Math.abs(Math.round(value))}%</span>
        </div>
      </div>
    );
  };

  // Sparkline sub-component for consistency
  const CategorySparkline = ({ data, color, type }: { data: any[], color: string, type: string }) => (
    <div className="h-10 w-16 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-cat-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="total"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#grad-cat-${type})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Tag className="w-5 h-5" />
        {title}
      </h3>
      <div className="space-y-2">
        {paginatedCategories.map((category, index) => {
          const budget = budgets.find(b => b.category.toLowerCase() === category.category.toLowerCase());
          const budgetRemaining = budget ? budget.amount - category.total : null;
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
              className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between gap-4">
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
                    {budget && budgetRemaining !== null && (
                      <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${budgetRemaining >= 0 ? 'text-income' : 'text-destructive'}`}>
                        {budgetRemaining >= 0
                          ? `${formatCurrency(budgetRemaining)} rest.`
                          : `${formatCurrency(Math.abs(budgetRemaining))} exc.`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CategorySparkline data={catHistory} color={chartColor} type={type} />
                  <div className="flex flex-col items-end min-w-[70px]">
                    <p className={`text-lg font-bold ${colorClass} whitespace-nowrap leading-none mb-1`}>
                      {formatCurrency(category.total)}
                    </p>
                    <TrendBadge 
                      value={categoryTrend} 
                      isExpense={type === 'expense'} 
                      comparisonValue={isActuallyNew ? undefined : compValue} 
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategoryBreakdown;
