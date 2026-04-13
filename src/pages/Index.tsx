import { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '@/types/finance';
import {
  loadData,
  addTransaction as saveTransaction,
  addCategory,
  updateTransaction,
  deleteTransaction,
} from '@/lib/storage';
import {
  calculateBalance,
  calculateAccountBalance,
  calculateTotalBalance,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCategorySummaries,
  formatCurrency,
} from '@/lib/calculations';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import BalanceCard from '@/components/BalanceCard';
import SummaryCards from '@/components/SummaryCards';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import TransactionModal from '@/components/TransactionModal';
import TransactionList from '@/components/TransactionList';
import AccountSelector from '@/components/AccountSelector';
import DashboardCharts from '@/components/DashboardCharts';
import MobileNav from '@/components/MobileNav';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { Wallet, Calendar, ChevronLeft, ChevronRight, Scale, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadBudgets } from '@/lib/budgetStorage';
import { Budget, RecurringTransaction, RecurrenceFrequency } from '@/types/finance';
import { addRecurringTransaction } from '@/lib/storage';
import { processRecurringTransactions } from '@/lib/automation';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(loadData());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | 'total'>('total');
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter transactions by selected month
  const { filteredTransactions, isCurrentMonth, selectedMonthLabel, currentMonthKey } = useMonthFilter(
    data.transactions,
    selectedMonth
  );

  useEffect(() => {
    const storedData = loadData();
    setData(storedData);

    // Handle quick-add from navigation
    const action = searchParams.get('action');
    if (action === 'add-expense') {
      openExpenseModal();
      setSearchParams({}, { replace: true });
    } else if (action === 'add-income') {
      openIncomeModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleAddTransaction = (
    transaction: Omit<Transaction, 'id'>,
    copyToNextMonth?: boolean,
    recurringOptions?: { frequency: string; intervalMonths?: number; endAfterMonths?: number }
  ) => {
    let isAutomating = !!recurringOptions;

    // Handle automation (Recurring Transaction creation)
    if (isAutomating) {
      const originalDate = transaction.date;

      const newRecurring: Omit<RecurringTransaction, 'id'> = {
        name: transaction.category,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        accountId: transaction.accountId,
        frequency: recurringOptions!.frequency as RecurrenceFrequency,
        intervalMonths: recurringOptions!.intervalMonths,
        endAfterMonths: recurringOptions!.endAfterMonths,
        startDate: originalDate,
        isActive: true,
      };

      // If editing, remove old transaction first
      if (editingTransaction) {
        deleteTransaction(editingTransaction.id);
      }

      // Save the current transaction as REAL (non-pending) with a normal UUID
      saveTransaction({ ...transaction, isPending: false });

      // Create the recurrence rule and project future (pending) occurrences starting NEXT period
      addRecurringTransaction(newRecurring);
      processRecurringTransactions();
      toast.info(`Automatización creada para "${transaction.category}"`);

      addCategory(transaction.category);
      setEditingTransaction(null);
      setData(loadData());
      setIsTransactionModalOpen(false);
      return;
    }

    if (editingTransaction) {
      // Normal edit without automation
      updateTransaction({ ...transaction, id: editingTransaction.id });
    } else {
      // New plain transaction
      saveTransaction(transaction);
    }

    setEditingTransaction(null);

    // copyToNextMonth logic (kept for backward compatibility, though recurring is better)
    if (copyToNextMonth && !isAutomating) {
      const currentDate = new Date(transaction.date);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
      const nextMonthTransaction: Transaction = {
        ...transaction,
        id: `${Date.now()}-${Math.random()}-copy`,
        date: nextMonth.toISOString().split('T')[0],
        isPending: true,
      };
      saveTransaction(nextMonthTransaction);
    }

    addCategory(transaction.category);
    setData(loadData());
    setIsTransactionModalOpen(false);
  };


  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransaction(transactionId);
    setData(loadData());
  };

  const handleConfirmTransaction = (transaction: Transaction) => {
    updateTransaction({
      ...transaction,
      isPending: false
    });
    setData(loadData());
    toast.success(`Confirmado: ${transaction.category}`);
  };

  const openExpenseModal = () => {
    setEditingTransaction(null);
    setTransactionType('expense');
    setIsTransactionModalOpen(true);
  };

  const openIncomeModal = () => {
    setEditingTransaction(null);
    setTransactionType('income');
    setIsTransactionModalOpen(true);
  };

  // Determine the month key for balance calculations
  const balanceMonthKey = selectedMonth || currentMonthKey;

  // Calculate balances for each account (filtered up to selected month)
  const accountBalances = data.accounts.map(account => ({
    account,
    balance: calculateAccountBalance(account, data.transactions, false, balanceMonthKey),
    projectedBalance: calculateAccountBalance(account, data.transactions, true, balanceMonthKey),
  }));

  // Total balances
  const totalBalance = calculateTotalBalance(data.accounts, data.transactions, false, balanceMonthKey);
  const totalProjectedBalance = calculateTotalBalance(data.accounts, data.transactions, true, balanceMonthKey);

  // Selected account balance
  let balance = totalBalance;
  let projectedBalance = totalProjectedBalance;
  if (selectedAccount !== 'total') {
    const selected = accountBalances.find(ab => ab.account.id === selectedAccount);
    if (selected) {
      balance = selected.balance;
      projectedBalance = selected.projectedBalance;
    }
  }

  // Exclude transfers from summaries and lists
  const nonTransferTransactions = filteredTransactions.filter(t => t.category !== 'Transferencia');

  // Load budgets for the current month view
  const currentBudgets = loadBudgets(balanceMonthKey);

  // Resolve account filter (undefined = all accounts)
  const accountFilter = selectedAccount === 'total' ? undefined : selectedAccount;

  // Monthly filtered calculations — respect selected account
  const totalIncome = calculateTotalIncome(nonTransferTransactions, accountFilter, false);
  const totalExpenses = calculateTotalExpenses(nonTransferTransactions, accountFilter, false);
  const expenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', accountFilter, false);
  const incomeCategories = calculateCategorySummaries(nonTransferTransactions, 'income', accountFilter, false);

  // Chart categories — same filter
  const chartExpenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', accountFilter, false);

  // Pending/future transactions — respect selected account
  const pendingExpenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', accountFilter, true);
  const pendingIncomeCategories = calculateCategorySummaries(nonTransferTransactions, 'income', accountFilter, true);

  // Separate transactions: regular (non-pending) sorted by most recent, pending sorted by closest date
  const regularTransactions = nonTransferTransactions
    .filter(t => !t.isPending && (!accountFilter || t.accountId === accountFilter))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTransactions = nonTransferTransactions
    .filter(t => t.isPending && (!accountFilter || t.accountId === accountFilter))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasAnyData = expenseCategories.length > 0 || incomeCategories.length > 0 ||
    pendingExpenseCategories.length > 0 || pendingIncomeCategories.length > 0;


  const handlePrevMonth = () => {
    const current = parseISO((selectedMonth || currentMonthKey) + '-01');
    const prevMonth = subMonths(current, 1);
    setSelectedMonth(format(prevMonth, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const current = parseISO((selectedMonth || currentMonthKey) + '-01');
    const nextMonth = addMonths(current, 1);
    setSelectedMonth(format(nextMonth, 'yyyy-MM'));
  };

  const handleBackToCurrentMonth = () => {
    setSelectedMonth(null);
  };

  return (
    <>
      <div className="min-h-screen app-gradient-bg lg:pl-20 pt-24">
        <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-8 transition-all duration-500 pb-32">
          <div className="mb-6 sm:mb-8">
            {/* Month Navigator Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-card rounded-2xl shadow-sm border border-border/50 mb-8">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col items-center min-w-[120px] px-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Periodo</span>
                  <span className="text-base font-extrabold text-primary capitalize leading-tight">{selectedMonthLabel}</span>
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4 text-primary" />
                </Button>
                {!isCurrentMonth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCurrentMonth}
                    className="text-xs h-8"
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

          {/* Summary Cards and Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 mb-8">
            <div className="col-span-1 xl:col-span-4 space-y-6">
              <BalanceCard balance={balance} projectedBalance={projectedBalance} />
              <SummaryCards totalIncome={totalIncome} totalExpenses={totalExpenses} />
            </div>
            <div className="col-span-1 xl:col-span-8">
              <DashboardCharts
                expenseCategories={chartExpenseCategories}
                selectedAccount={selectedAccount}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                accounts={data.accounts}
                categoryCatalog={data.categories}
              />
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8 pb-24">
            {/* 1. Pending/Future Categories FIRST */}
            {pendingExpenseCategories.length > 0 && (
              <CategoryBreakdown
                categories={pendingExpenseCategories}
                type="expense"
                isPending={true}
                transactions={pendingTransactions}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onConfirmTransaction={handleConfirmTransaction}
                categoryCatalog={data.categories}
              />
            )}
            {pendingIncomeCategories.length > 0 && (
              <CategoryBreakdown
                categories={pendingIncomeCategories}
                type="income"
                isPending={true}
                transactions={pendingTransactions}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onConfirmTransaction={handleConfirmTransaction}
                categoryCatalog={data.categories}
              />
            )}

            {/* 2. Current Expense Categories */}
            {expenseCategories.length > 0 && (
              <CategoryBreakdown 
                categories={expenseCategories} 
                type="expense" 
                isPending={false} 
                budgets={currentBudgets} 
                categoryCatalog={data.categories}
              />
            )}

            {/* 3. Current Income Categories */}
            {incomeCategories.length > 0 && (
              <CategoryBreakdown 
                categories={incomeCategories} 
                type="income" 
                isPending={false} 
                categoryCatalog={data.categories}
              />
            )}

            {/* Empty State */}
            {!hasAnyData && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Aún no hay transacciones registradas.
                </p>
                <p className="text-muted-foreground mt-2">
                  Usa los botones + y - para agregar ingresos y gastos.
                </p>
              </div>
            )}

            {/* 4. Transaction List - regular transactions only (excluding pending) */}
            <TransactionList
              transactions={regularTransactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
            />
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
        />

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </>
  );
};

export default Index;
