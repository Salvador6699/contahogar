import { useState, useEffect } from 'react';
import { Transaction, TransactionType, AccountView } from '@/types/finance';
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
} from '@/lib/calculations';
import { useMonthFilter } from '@/hooks/useMonthFilter';
import BalanceCard from '@/components/BalanceCard';
import SummaryCards from '@/components/SummaryCards';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import TransactionModal from '@/components/TransactionModal';
import TransactionList from '@/components/TransactionList';
import FloatingButtons from '@/components/FloatingButtons';
import AccountSelector from '@/components/AccountSelector';
import DashboardCharts from '@/components/DashboardCharts';
import MobileNav from '@/components/MobileNav';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { Wallet, Calendar, ChevronLeft, ChevronRight, Scale, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { loadBudgets } from '@/lib/budgetStorage';
import { Budget } from '@/types/finance';

const Index = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(loadData());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | 'total'>('total');

  // Filter transactions by selected month
  const { filteredTransactions, isCurrentMonth, selectedMonthLabel, currentMonthKey } = useMonthFilter(
    data.transactions,
    selectedMonth
  );

  useEffect(() => {
    const storedData = loadData();
    setData(storedData);
  }, []);

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>, copyToNextMonth?: boolean) => {
    if (editingTransaction) {
      // Update existing transaction
      const updatedTransaction: Transaction = {
        ...transaction,
        id: editingTransaction.id,
      };
      updateTransaction(updatedTransaction);

      // Copy to next month if requested
      if (copyToNextMonth) {
        const currentDate = new Date(transaction.date);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        const nextMonthTransaction: Transaction = {
          ...transaction,
          id: `${Date.now()}-${Math.random()}-copy`,
          date: nextMonth.toISOString().split('T')[0],
          isPending: true, // Always mark as future/pending
        };
        saveTransaction(nextMonthTransaction);
      }

      setEditingTransaction(null);
    } else {
      // Add new transaction
      const newTransaction: Transaction = {
        ...transaction,
        id: `${Date.now()}-${Math.random()}`,
      };
      saveTransaction(newTransaction);
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
  const totalBalance = calculateTotalBalance(data.accounts, data.transactions, false);
  const totalProjectedBalance = calculateTotalBalance(data.accounts, data.transactions, true);

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

  // Monthly filtered calculations (all accounts combined for categories)
  const totalIncome = calculateTotalIncome(nonTransferTransactions, undefined, false);
  const totalExpenses = calculateTotalExpenses(nonTransferTransactions, undefined, false);
  const expenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', undefined, false);
  const incomeCategories = calculateCategorySummaries(nonTransferTransactions, 'income', undefined, false);

  // Account-filtered expense categories for the Top Gastos chart
  const chartExpenseCategories = selectedAccount === 'total'
    ? calculateCategorySummaries(nonTransferTransactions, 'expense', undefined, false)
    : calculateCategorySummaries(nonTransferTransactions, 'expense', selectedAccount, false);

  // Pending/future transactions (monthly filtered)
  const pendingExpenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', undefined, true);
  const pendingIncomeCategories = calculateCategorySummaries(nonTransferTransactions, 'income', undefined, true);

  // Separate transactions: regular (non-pending) sorted by most recent, pending sorted by closest date
  const regularTransactions = nonTransferTransactions
    .filter(t => !t.isPending)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTransactions = nonTransferTransactions
    .filter(t => t.isPending)
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
      <div className="min-h-screen app-gradient-bg lg:pl-20">
        <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-8 transition-all duration-500 pb-32">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
                  <Wallet className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">ContaHogar</h1>
              </div>
            </div>

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
              />
            )}

            {/* 2. Current Expense Categories */}
            {expenseCategories.length > 0 && (
              <CategoryBreakdown categories={expenseCategories} type="expense" isPending={false} budgets={currentBudgets} />
            )}

            {/* 3. Current Income Categories */}
            {incomeCategories.length > 0 && (
              <CategoryBreakdown categories={incomeCategories} type="income" isPending={false} />
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

        {/* Floating Action Buttons */}
        <FloatingButtons
          onAddIncome={openIncomeModal}
          onAddExpense={openExpenseModal}
        />

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
