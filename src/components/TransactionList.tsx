import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Transaction } from '@/types/finance';
import { formatCurrency } from '@/lib/calculations';
import { Pencil, Trash2, Calendar, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SmartPagination } from '@/components/SmartPagination';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

const ITEMS_PER_PAGE = 5;

const TransactionList = ({ transactions, onEdit, onDelete }: TransactionListProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return sortedTransactions;
    
    const query = searchQuery.toLowerCase().trim();
    return sortedTransactions.filter(transaction => {
      const queryLower = query.toLowerCase();
      const categoryMatch = transaction.category.toLowerCase().includes(queryLower);
      const descriptionMatch = (transaction.description || '').toLowerCase().includes(queryLower);
      const amountMatch = transaction.amount.toString().includes(queryLower);
      const dateMatch = new Date(transaction.date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).toLowerCase().includes(queryLower);
      const typeMatch = (transaction.type === 'income' ? 'ingreso' : 'gasto').includes(queryLower);
      
      return categoryMatch || descriptionMatch || amountMatch || dateMatch || typeMatch;
    });
  }, [sortedTransactions, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Historial de Transacciones
        </h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por categoría, importe, fecha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron transacciones</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income';
                const bgClass = isIncome ? 'bg-income-light' : 'bg-expense-light';
                const borderClass = isIncome ? 'border-income/20' : 'border-expense/20';
                const colorClass = isIncome ? 'text-income' : 'text-expense';

                return (
                  <Card
                    key={transaction.id}
                    className={`p-4 ${bgClass} border-2 ${borderClass} hover:shadow-md transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-foreground capitalize">
                            {transaction.category}
                          </p>
                          {transaction.isPending && (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter bg-muted px-1.5 py-0.5 rounded border border-border/50">
                              <Clock className="w-2 h-2" />
                              Previsto
                            </span>
                          )}
                        </div>
                        {transaction.description && (
                          <p className="text-[10px] text-muted-foreground italic truncate mb-1">
                            {transaction.description}
                          </p>
                        )}
                        <p className="text-[10px] font-medium text-muted-foreground/80">
                          {new Date(transaction.date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-lg font-bold ${colorClass} whitespace-nowrap`}>
                          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(transaction)}
                            className="h-8 w-8 hover:bg-background/50"
                            aria-label="Editar transacción"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(transaction.id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Eliminar transacción"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            <SmartPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
            
            <p className="text-center text-xs text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length} transacciones
            </p>
          </>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta transacción de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransactionList;
