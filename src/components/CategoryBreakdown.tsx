import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategorySummary, Transaction, Budget } from '@/types/finance';
import { formatCurrency } from '@/lib/calculations';
import { Tag, Pencil, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';

interface CategoryBreakdownProps {
  categories: CategorySummary[];
  type: 'income' | 'expense';
  isPending?: boolean;
  transactions?: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transactionId: string) => void;
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
  budgets = [],
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

    if (pendingItems.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-5 h-5" />
          {title}
        </h3>
        <div className="space-y-2">
          {paginatedItems.map((transaction) => (
            <Card
              key={transaction.id}
              className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground capitalize">{transaction.category}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(transaction.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
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

          return (
            <Card
              key={index}
              className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground capitalize">{category.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.count} {category.count === 1 ? 'transacción' : 'transacciones'}
                  </p>
                  {budget && budgetRemaining !== null && (
                    <p className={`text-xs font-medium ${budgetRemaining >= 0 ? 'text-income' : 'text-destructive'}`}>
                      {budgetRemaining >= 0
                        ? `${formatCurrency(budgetRemaining)} restante`
                        : `${formatCurrency(Math.abs(budgetRemaining))} excedido`}
                    </p>
                  )}
                </div>
                <p className={`text-xl font-bold ${colorClass}`}>
                  {formatCurrency(category.total)}
                </p>
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
