import { useState } from "react";
import { Transaction, TransactionType } from "@/types/finance";
import { calculateCategorySummaries } from "@/lib/calculations";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import TransactionModal from "@/components/TransactionModal";
import { Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { appToast as toast } from "@/lib/swal";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";

const UpcomingPage = () => {
  const navigate = useNavigate();
  
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { transactions, addTransaction, updateTransaction, deleteTransaction, isLoading: transactionsLoading } = useTransactions();
  const { categories } = useCategories();

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { filteredTransactions } = useMonthFilter(transactions, null);

  const nonTransferTransactions = filteredTransactions.filter(
    (t) => t.category !== "Transferencia"
  );

  const pendingExpenseCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "expense",
    undefined,
    true
  );
  
  const pendingIncomeCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "income",
    undefined,
    true
  );

  const pendingTransactions = nonTransferTransactions
    .filter((t) => t.isPending)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasAnyData = pendingExpenseCategories.length > 0 || pendingIncomeCategories.length > 0;

  const handleAddTransaction = async (
    transaction: Omit<Transaction, "id">,
  ) => {
    if (editingTransaction) {
      await updateTransaction({ ...transaction, id: editingTransaction.id });
    } else {
      await addTransaction(transaction);
    }
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);
    toast.success(editingTransaction ? "Transacción actualizada" : "Transacción guardada");
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (transaction.isPending && transaction.id.startsWith("rec_")) {
      const parts = transaction.id.split("_");
      const ruleId = parts.length >= 2 ? parts[1] : null;
      toast.info("Este gasto futuro forma parte de una regla. Te redirigimos para modificar la regla...");
      navigate(`/ajustes?tab=gastos_fijos${ruleId ? `&editRuleId=${ruleId}` : ""}`);
      return;
    }
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    toast.success("Transacción eliminada");
  };

  const handleConfirmTransaction = async (transaction: Transaction) => {
    await updateTransaction({
      ...transaction,
      isPending: false,
      date: new Date().toISOString().split("T")[0], 
    });
    toast.success("¡Transacción confirmada!");
  };

  const handleToggleIgnoreTransaction = async (transaction: Transaction) => {
    await updateTransaction({
      ...transaction,
      isIgnored: !transaction.isIgnored,
    });
    toast.success(
      transaction.isIgnored
        ? "Transacción restaurada"
        : "Transacción ignorada para este mes"
    );
  };

  if (accountsLoading || transactionsLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 lg:px-8 py-6 sm:py-8 transition-all duration-500 pb-32">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-10 w-10 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Próximos Pagos</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus gastos e ingresos futuros</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {pendingExpenseCategories.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-destructive flex items-center gap-2">Gastos Pendientes</h2>
            <CategoryBreakdown
              categories={pendingExpenseCategories}
              type="expense"
              isPending={true}
              transactions={pendingTransactions}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onConfirmTransaction={handleConfirmTransaction}
              onToggleIgnoreTransaction={handleToggleIgnoreTransaction}
              categoryCatalog={categories}
              accounts={accounts}
            />
          </div>
        )}

        {pendingIncomeCategories.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-bold text-income flex items-center gap-2">Ingresos Pendientes</h2>
            <CategoryBreakdown
              categories={pendingIncomeCategories}
              type="income"
              isPending={true}
              transactions={pendingTransactions}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onConfirmTransaction={handleConfirmTransaction}
              onToggleIgnoreTransaction={handleToggleIgnoreTransaction}
              categoryCatalog={categories}
              accounts={accounts}
            />
          </div>
        )}

        {!hasAnyData && (
          <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border shadow-sm">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg font-bold">No tienes pagos previstos próximamente.</p>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              Los gastos fijos (como Netflix o Alquiler) aparecerán aquí cuando falte poco para que se cobren.
            </p>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleAddTransaction}
        type={transactionType}
        categories={categories}
        editingTransaction={editingTransaction}
      />
    </div>
  );
};

export default UpcomingPage;
