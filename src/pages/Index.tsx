import { useState, useEffect, useMemo } from "react";
import {
  Transaction,
  TransactionType,
  FavoriteExpense,
} from "@/types/finance";
import {
  loadData,
  saveData,
  updateAlertSettings,
  findSimilarCategory,
} from "@/lib/storage";
import {
  calculateBalance,
  calculateAccountBalance,
  calculateTotalBalance,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCategorySummaries,
  formatCurrency,
  calculatePastMonthsHistory,
  calculateSpendingPace,
} from "@/lib/calculations";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import BalanceCard from "@/components/BalanceCard";
import SummaryCards from "@/components/SummaryCards";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import QuickExpenses from "@/components/QuickExpenses";
import TransactionModal from "@/components/TransactionModal";
import TransactionList from "@/components/TransactionList";
import AccountSelector from "@/components/AccountSelector";
import QuickAmountModal from "@/components/QuickAmountModal";
import { VoiceButton } from "@/components/VoiceButton";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import {
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Scale,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appToast as toast } from "@/lib/swal";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableWidget } from "@/components/SortableWidget";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { usePlanning } from "@/hooks/usePlanning";
import { useLoans } from "@/hooks/useLoans";
import { useFavorites } from "@/hooks/useFavorites";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [legacyData, setLegacyData] = useState(loadData());
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { transactions, addTransaction: rqAddTransaction, updateTransaction: rqUpdateTransaction, deleteTransaction: rqDeleteTransaction, isLoading: transactionsLoading } = useTransactions();
  const { categories, addCategory: rqAddCategory } = useCategories();
  const { budgets } = usePlanning();

  const data = useMemo(() => ({
    ...legacyData,
    accounts,
    transactions,
    categories,
    budgets
  }), [legacyData, accounts, transactions, categories, budgets]);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    searchParams.get("month"),
  );
  const [selectedAccount, setSelectedAccount] = useState<string | "total">(
    "total",
  );
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false);
  const [editingFavorite, setEditingFavorite] =
    useState<FavoriteExpense | null>(null);
  const [isQuickAmountModalOpen, setIsQuickAmountModalOpen] = useState(false);
  const [activeQuickFavorite, setActiveQuickFavorite] =
    useState<FavoriteExpense | null>(null);

  const { favorites, deleteFavorite } = useFavorites();
  const { applyFractionatedTransaction } = useLoans();

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const defaultOrder = ["summaries", "upcoming", "categories", "transactions"];
    const saved = localStorage.getItem("homeWidgetOrder");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        // Migrar 'charts' antiguo a los nuevos
        let migrated = parsed.flatMap(item => item === "charts" ? ["upcoming", "categories"] : item);
        
        // Asegurar que no falte ninguno de los por defecto
        const missing = defaultOrder.filter(w => !migrated.includes(w));
        migrated = [...migrated, ...missing];
        
        // Limpiar inválidos
        migrated = migrated.filter(w => defaultOrder.includes(w));
        
        return migrated;
      } catch (e) {}
    }
    return defaultOrder;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("homeWidgetOrder", JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const {
    filteredTransactions,
    isCurrentMonth,
    selectedMonthLabel,
    currentMonthKey,
  } = useMonthFilter(data.transactions, selectedMonth);

  const history = useMemo(() => {
    const baseDate = selectedMonth
      ? parseISO(selectedMonth + "-01")
      : new Date();
    return calculatePastMonthsHistory(
      data.transactions,
      selectedAccount === "total" ? undefined : selectedAccount,
      6,
      baseDate,
    );
  }, [data.transactions, selectedAccount, selectedMonth]);

  useEffect(() => {
    // Only update legacy data that hasn't been migrated yet
    const storedData = loadData();
    setLegacyData(storedData);

    let paramsChanged = false;
    const newParams = new URLSearchParams(searchParams);

    // Handle month selection from History
    const monthParam = searchParams.get("month");
    if (monthParam) {
      setSelectedMonth(monthParam);
      newParams.delete("month");
      paramsChanged = true;
    }

    // Handle quick-add from navigation
    const action = searchParams.get("action");
    if (action === "add-expense") {
      openExpenseModal();
      newParams.delete("action");
      paramsChanged = true;
    } else if (action === "add-income") {
      openIncomeModal();
      newParams.delete("action");
      paramsChanged = true;
    } else if (action === "quick-expense") {
      const favId = searchParams.get("id");
      const fav = favorites.find((f) => f.id === favId);
      if (fav) {
        setActiveQuickFavorite(fav);
        setIsQuickAmountModalOpen(true);
      }
      newParams.delete("action");
      newParams.delete("id");
      paramsChanged = true;
    } else if (action === "manage-favorites") {
      setIsFavoriteModalOpen(true);
      newParams.delete("action");
      paramsChanged = true;
    }

    if (paramsChanged) {
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleAddTransaction = async (
    transaction: Omit<Transaction, "id">,
    copyToNextMonth?: boolean,
    fractionationData?: { isFractionated: boolean; installments: number; installmentAmount: number; firstInstallmentDate: string; setupFee: number; setupFeeDate: string; }
  ) => {

    if (editingTransaction) {
      if (fractionationData?.isFractionated) {
        await applyFractionatedTransaction({ transaction, fractionationData, editingId: editingTransaction.id });
      } else {
        await rqUpdateTransaction({ ...transaction, id: editingTransaction.id });
      }
    } else {
      if (fractionationData?.isFractionated) {
        await applyFractionatedTransaction({ transaction, fractionationData });
      } else {
        await rqAddTransaction(transaction);
      }
    }

    setEditingTransaction(null);

    if (copyToNextMonth) {
      const currentDate = new Date(transaction.date);
      const nextMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        currentDate.getDate(),
      );
      const nextMonthTransaction: Omit<Transaction, "id"> = {
        ...transaction,
        date: nextMonth.toISOString().split("T")[0],
        isPending: true,
      };
      await rqAddTransaction(nextMonthTransaction);
    }

    // Add category using React Query
    const catExists = categories.some(c => (typeof c === "string" ? c : c.name) === transaction.category);
    if (!catExists) {
        await rqAddCategory(transaction.category);
    }
    
    setIsTransactionModalOpen(false);
    toast.success(editingTransaction ? "Transacción actualizada" : "Transacción guardada");
  };

  const handleQuickAdd = (fav: FavoriteExpense) => {
    setActiveQuickFavorite(fav);
    setIsQuickAmountModalOpen(true);
  };

  const handleSaveQuickAmount = async (amount: number, accountId: string) => {
    if (!activeQuickFavorite) return;

    const newTransaction: Omit<Transaction, "id"> = {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: amount,
      category: activeQuickFavorite.category,
      type: activeQuickFavorite.type,
      accountId: accountId,
      description:
        activeQuickFavorite.description ||
        `Gasto rápido: ${activeQuickFavorite.name}`,
    };
    
    await rqAddTransaction(newTransaction);

    toast.success(`${activeQuickFavorite.name} registrado: ${formatCurrency(amount)}`);
    setIsQuickAmountModalOpen(false);
    setActiveQuickFavorite(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    // Si es un gasto futuro (pendiente) proveniente de una regla de gasto fijo automatizado
    if (transaction.isPending && transaction.id.startsWith("rec_")) {
      const parts = transaction.id.split("_");
      const ruleId = parts.length >= 2 ? parts[1] : null;
      toast.info("Este gasto futuro forma parte de una regla de gasto fijo automatizado. Te redirigimos para modificar la regla...");
      navigate(`/ajustes?tab=gastos_fijos${ruleId ? `&editRuleId=${ruleId}` : ""}`);
      return;
    }

    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    await rqDeleteTransaction(id);
    toast.success("Transacción eliminada");
  };

  const handleUpdateAlertSettings = (newSettings: Parameters<typeof updateAlertSettings>[0]) => {
    updateAlertSettings(newSettings);
    setLegacyData(loadData());
  };

  const handleConfirmTransaction = async (transaction: Transaction) => {
    // Check for linked account
    const account = data.accounts.find((a) => a.id === transaction.accountId);
    let finalAccountId = transaction.accountId;
    if (account && account.linkedAccountId) {
      finalAccountId = account.linkedAccountId;
    }

    await rqUpdateTransaction({
      ...transaction,
      isPending: false,
      accountId: finalAccountId,
    });

    toast.success("Gasto confirmado");
  };

  const handleToggleIgnoreTransaction = async (transaction: Transaction) => {
    await rqUpdateTransaction({
      ...transaction,
      isIgnored: !transaction.isIgnored
    });
  };

  const openExpenseModal = () => {
    setEditingTransaction(null);
    setTransactionType("expense");
    setIsTransactionModalOpen(true);
  };

  const openIncomeModal = () => {
    setEditingTransaction(null);
    setTransactionType("income");
    setIsTransactionModalOpen(true);
  };

  const handleVoiceResult = (result: { amount: number; description: string }) => {
    const matchedCategory = findSimilarCategory(result.description, data.categories) || result.description;
    
    sessionStorage.setItem("transactionDraft_expense", JSON.stringify({
      amount: result.amount > 0 ? result.amount.toString() : "",
      category: matchedCategory,
      description: result.description,
    }));
    
    openExpenseModal();
  };

  // Determine the month key for balance calculations
  const balanceMonthKey = selectedMonth || currentMonthKey;

  // Calculate balances for each account (filtered up to selected month)
  const accountBalances = data.accounts.map((account) => ({
    account,
    balance: calculateAccountBalance(
      account,
      data.transactions,
      false,
      balanceMonthKey,
    ),
    projectedBalance: calculateAccountBalance(
      account,
      data.transactions,
      true,
      balanceMonthKey,
    ),
  }));

  // Total balances
  const totalBalance = calculateTotalBalance(
    data.accounts,
    data.transactions,
    false,
    balanceMonthKey,
  );
  const totalProjectedBalance = calculateTotalBalance(
    data.accounts,
    data.transactions,
    true,
    balanceMonthKey,
  );

  // Selected account balance
  let balance = totalBalance;
  let projectedBalance = totalProjectedBalance;
  if (selectedAccount !== "total") {
    const selected = accountBalances.find(
      (ab) => ab.account.id === selectedAccount,
    );
    if (selected) {
      balance = selected.balance;
      projectedBalance = selected.projectedBalance;
    }
  }

  // Exclude transfers from summaries and lists
  const nonTransferTransactions = filteredTransactions.filter(
    (t) => t.category !== "Transferencia",
  );

  // Resolve account filter (undefined = all accounts)
  const accountFilter =
    selectedAccount === "total" ? undefined : selectedAccount;

  // Monthly filtered calculations — respect selected account
  const totalIncome = calculateTotalIncome(
    nonTransferTransactions,
    accountFilter,
    false,
  );
  const totalExpenses = calculateTotalExpenses(
    nonTransferTransactions,
    accountFilter,
    false,
  );
  const expenseCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "expense",
    accountFilter,
    false,
  );
  const incomeCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "income",
    accountFilter,
    false,
  );

  // Chart categories — same filter
  const chartExpenseCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "expense",
    accountFilter,
    false,
  );

  // Pending/future transactions — respect selected account
  const pendingExpenseCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "expense",
    accountFilter,
    true,
  );
  const pendingIncomeCategories = calculateCategorySummaries(
    nonTransferTransactions,
    "income",
    accountFilter,
    true,
  );

  // Separate transactions: regular (non-pending) sorted by most recent, pending sorted by closest date
  const regularTransactions = nonTransferTransactions
    .filter(
      (t) => !t.isPending && !t.isIgnored && (!accountFilter || t.accountId === accountFilter),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTransactions = nonTransferTransactions
    .filter(
      (t) => t.isPending && (!accountFilter || t.accountId === accountFilter),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasAnyData =
    expenseCategories.length > 0 ||
    incomeCategories.length > 0 ||
    pendingExpenseCategories.length > 0 ||
    pendingIncomeCategories.length > 0;

  // History and Pace for trends
  const baseDate = useMemo(
    () => (selectedMonth ? parseISO(selectedMonth + "-01") : new Date()),
    [selectedMonth],
  );
  const spendingPace = isCurrentMonth
    ? calculateSpendingPace(data.transactions, accountFilter)
    : undefined;

  const handlePrevMonth = () => {
    const current = parseISO((selectedMonth || currentMonthKey) + "-01");
    const prevMonth = subMonths(current, 1);
    setSelectedMonth(format(prevMonth, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const current = parseISO((selectedMonth || currentMonthKey) + "-01");
    const nextMonth = addMonths(current, 1);
    setSelectedMonth(format(nextMonth, "yyyy-MM"));
  };

  const handleBackToCurrentMonth = () => {
    setSelectedMonth(null);
  };

  if (accountsLoading || transactionsLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  const WIDGET_COMPONENTS: Record<string, React.ReactNode> = {
    summaries: (
      <div className="w-full">
        <SummaryCards
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          history={history}
          spendingPace={spendingPace}
          transactions={regularTransactions}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </div>
    ),
    upcoming: pendingExpenseCategories.length > 0 ? (
      <div className="w-full">
        <div className="bg-white dark:bg-card rounded-[32px] p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-white/20 dark:border-white/5">
          <div className="flex items-center gap-2 mb-4">
             <Calendar className="w-5 h-5 text-muted-foreground" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Próximos Pagos</h3>
          </div>
          <CategoryBreakdown
            categories={pendingExpenseCategories.slice(0, 3)}
            type="expense"
            isPending={true}
            transactions={pendingTransactions}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onConfirmTransaction={handleConfirmTransaction}
            onToggleIgnoreTransaction={handleToggleIgnoreTransaction}
            categoryCatalog={data.categories}
            accounts={data.accounts}
          />
          {pendingExpenseCategories.length > 3 && (
            <Button variant="ghost" className="w-full mt-2 text-xs font-bold" onClick={() => navigate('/proximos')}>Ver todos ({pendingExpenseCategories.length})</Button>
          )}
        </div>
      </div>
    ) : <div className="hidden"></div>,
    categories: expenseCategories.length > 0 ? (
      <div className="w-full">
        <div className="bg-white dark:bg-card rounded-[32px] p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-white/20 dark:border-white/5">
           <div className="flex items-center gap-2 mb-4">
             <BarChart3 className="w-5 h-5 text-muted-foreground" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Gastos por Categoría</h3>
           </div>
           <CategoryBreakdown
              categories={expenseCategories}
              type="expense"
              isPending={false}
              categoryCatalog={data.categories}
              transactions={data.transactions}
              selectedAccount={accountFilter}
              baseDate={baseDate}
              budgets={data.budgets}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
        </div>
      </div>
    ) : <div className="hidden"></div>,
    transactions: (
      <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-sm border border-border/50 w-full">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-bold">Últimos Movimientos</h3>
           <Button variant="ghost" size="sm" onClick={() => navigate('/historial')} className="text-xs font-bold">Ver historial</Button>
        </div>
        
        <TransactionList
          transactions={regularTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />

        {/* Empty State */}
        {!hasAnyData && (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl mt-4">
            <p className="text-muted-foreground text-lg font-bold">
              Aún no hay transacciones registradas.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Usa los botones de Añadir Gasto o Ingreso arriba.
            </p>
          </div>
        )}
      </div>
    )
  };

  return (
    <>
      <div className="w-full">
        <div className="w-full max-w-full mx-auto px-4 lg:px-12 py-6 sm:py-8 transition-all duration-500 pb-32">
          <div className="mb-6 sm:mb-8">
            {/* Month Navigator Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-2 mx-auto sm:mx-0 bg-white dark:bg-card p-1.5 rounded-full shadow-sm border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={handlePrevMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col items-center min-w-[100px] px-2 cursor-default">
                  <span className="text-sm font-bold text-primary capitalize leading-tight">
                    {selectedMonthLabel}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {!isCurrentMonth && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBackToCurrentMonth}
                    className="h-8 rounded-full text-xs ml-1"
                  >
                    Hoy
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Account Selector */}
          <div className="mb-4">
            <AccountSelector
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
              accounts={data.accounts}
              accountBalances={accountBalances}
            />
          </div>

          <div className="flex flex-col gap-6 lg:gap-8 mb-8">
            {/* Top Row: Hero Balance */}
            <div className="w-full">
              <BalanceCard
                balance={balance}
                projectedBalance={projectedBalance}
              />
            </div>

            {/* Draggable Widgets Area */}
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={widgetOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-6 lg:gap-8 mb-8 pb-24 w-full">
                  {widgetOrder.map((id) => (
                    <SortableWidget key={id} id={id}>
                      {WIDGET_COMPONENTS[id]}
                    </SortableWidget>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Transaction Modal */}
        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={handleAddTransaction}
          type={transactionType}
          categories={data.categories}
          editingTransaction={editingTransaction}
          defaultAccountId={
            selectedAccount === "total" ? undefined : selectedAccount
          }
        />

        {/* Quick Amount Modal */}
        {activeQuickFavorite && (
          <QuickAmountModal
            isOpen={isQuickAmountModalOpen}
            onClose={() => {
              setIsQuickAmountModalOpen(false);
              setActiveQuickFavorite(null);
            }}
            onSave={handleSaveQuickAmount}
            categoryName={activeQuickFavorite.category}
            accountId={activeQuickFavorite.accountId}
            type={activeQuickFavorite.type}
            accounts={data.accounts}
            categories={data.categories}
            favoriteName={activeQuickFavorite.name}
          />
        )}

        {/* Voice Assistant */}
        <VoiceButton onResult={handleVoiceResult} />
        
        {/* Mobile Navigation */}
      </div>
    </>
  );
};

export default Index;
