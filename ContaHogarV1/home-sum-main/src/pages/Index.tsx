import { useState, useEffect } from 'react';
import { Transaction, TransactionType, AccountType, AccountView } from '@/types/finance';
import {
  loadData,
  addTransaction as saveTransaction,
  updateInitialBalance,
  addCategory,
  updateTransaction,
  deleteTransaction,
} from '@/lib/storage';
import {
  calculateBalance,
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
import InitialBalanceDialog from '@/components/InitialBalanceDialog';
import BalanceComparisonModal from '@/components/BalanceComparisonModal';
import MonthlySummaryModal from '@/components/MonthlySummaryModal';
import DataManagementModal from '@/components/DataManagementModal';
import CategoryAveragesModal from '@/components/CategoryAveragesModal';
import AccountSelector from '@/components/AccountSelector';
import TransferModal from '@/components/TransferModal';
import ThemeToggle from '@/components/ThemeToggle';
import { Wallet, Scale, Calendar, ArrowLeft, Database, BarChart3, ArrowLeftRight, PiggyBank } from 'lucide-react';
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
  const [showInitialBalanceDialog, setShowInitialBalanceDialog] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showCategoryAverages, setShowCategoryAverages] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountView>('total');

  // Filter transactions by selected month
  const { filteredTransactions, isCurrentMonth, selectedMonthLabel, currentMonthKey } = useMonthFilter(
    data.transactions,
    selectedMonth
  );

  useEffect(() => {
    const storedData = loadData();
    setData(storedData);
    
    // Show initial balance dialog if no data exists
    if (storedData.transactions.length === 0 && storedData.initialBankBalance === 0 && storedData.initialCashBalance === 0) {
      setShowInitialBalanceDialog(true);
    }
  }, []);

  const handleSaveInitialBalance = (bankBalance: number, cashBalance: number) => {
    updateInitialBalance('bank', bankBalance);
    updateInitialBalance('cash', cashBalance);
    setData(loadData());
    setShowInitialBalanceDialog(false);
  };

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

  const handleSaveAdjustments = (transactions: Omit<Transaction, 'id'>[]) => {
    transactions.forEach(transaction => {
      const newTransaction: Transaction = {
        ...transaction,
        id: `${Date.now()}-${Math.random()}`,
      };
      saveTransaction(newTransaction);
      addCategory(transaction.category);
    });
    setData(loadData());
  };

  const handleTransfer = (amount: number, from: AccountType, to: AccountType) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Create expense from source account
    const expenseTransaction: Transaction = {
      id: `${Date.now()}-${Math.random()}-transfer-out`,
      date: today,
      amount,
      category: 'Transferencia',
      type: 'expense',
      account: from,
      isPending: false,
    };
    
    // Create income to destination account
    const incomeTransaction: Transaction = {
      id: `${Date.now()}-${Math.random()}-transfer-in`,
      date: today,
      amount,
      category: 'Transferencia',
      type: 'income',
      account: to,
      isPending: false,
    };
    
    saveTransaction(expenseTransaction);
    saveTransaction(incomeTransaction);
    addCategory('Transferencia');
    setData(loadData());
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
  const bankBalance = calculateBalance(data.initialBankBalance, data.transactions, false, 'bank', balanceMonthKey);
  const cashBalance = calculateBalance(data.initialCashBalance, data.transactions, false, 'cash', balanceMonthKey);
  const bankProjectedBalance = calculateBalance(data.initialBankBalance, data.transactions, true, 'bank', balanceMonthKey);
  const cashProjectedBalance = calculateBalance(data.initialCashBalance, data.transactions, true, 'cash', balanceMonthKey);
  
  // Total balances
  const totalBalance = bankBalance + cashBalance;
  const totalProjectedBalance = bankProjectedBalance + cashProjectedBalance;
  
  // Selected account balance
  const balance = selectedAccount === 'total' ? totalBalance : selectedAccount === 'bank' ? bankBalance : cashBalance;
  const projectedBalance = selectedAccount === 'total' ? totalProjectedBalance : selectedAccount === 'bank' ? bankProjectedBalance : cashProjectedBalance;
  
  // Exclude transfers from summaries and lists
  const nonTransferTransactions = filteredTransactions.filter(t => t.category !== 'Transferencia');
  
  // Load budgets for the current month view
  const currentBudgets = loadBudgets(balanceMonthKey);
  
  // Monthly filtered calculations (all accounts combined for categories)
  const totalIncome = calculateTotalIncome(nonTransferTransactions, false);
  const totalExpenses = calculateTotalExpenses(nonTransferTransactions, false);
  const expenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', false);
  const incomeCategories = calculateCategorySummaries(nonTransferTransactions, 'income', false);
  
  // Pending/future transactions (monthly filtered)
  const pendingExpenseCategories = calculateCategorySummaries(nonTransferTransactions, 'expense', true);
  const pendingIncomeCategories = calculateCategorySummaries(nonTransferTransactions, 'income', true);

  // Separate transactions: regular (non-pending) sorted by most recent, pending sorted by closest date
  const regularTransactions = nonTransferTransactions
    .filter(t => !t.isPending)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const pendingTransactions = nonTransferTransactions
    .filter(t => t.isPending)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasAnyData = expenseCategories.length > 0 || incomeCategories.length > 0 || 
                     pendingExpenseCategories.length > 0 || pendingIncomeCategories.length > 0;

  const handleSelectMonth = (month: string) => {
    setSelectedMonth(month);
  };

  const handleBackToCurrentMonth = () => {
    setSelectedMonth(null);
  };

  return (
    <>
      <div className="min-h-screen app-gradient-bg">
        <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">ContaHogar</h1>
                  {!isCurrentMonth && selectedMonthLabel && (
                    <p className="text-sm text-primary capitalize">{selectedMonthLabel}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!isCurrentMonth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToCurrentMonth}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Mes Actual</span>
                    <span className="sm:hidden">Volver</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Botón Resumen Meses clickeado, estado actual:', showMonthlySummary);
                    setShowMonthlySummary(true);
                    console.log('Estado después de setear:', true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Resumen Meses</span>
                </Button>
                {isCurrentMonth && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTransferModal(true)}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span className="hidden sm:inline">Transferir</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComparisonModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Scale className="w-4 h-4" />
                      <span className="hidden sm:inline">Comparar</span>
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDataManagement(true)}
                  className="flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline">Datos</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryAverages(true)}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Medias</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/presupuestos?month=${balanceMonthKey}`)}
                  className="flex items-center gap-2"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span className="hidden sm:inline">Presupuestos</span>
                </Button>
                <ThemeToggle />
              </div>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">Gestiona tu dinero de forma simple</p>
          </div>

          {/* Account Selector */}
          <div className="mb-4">
            <AccountSelector
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
              bankBalance={bankBalance}
              cashBalance={cashBalance}
            />
          </div>

          {/* Balance Card */}
          <div className="mb-6">
            <BalanceCard balance={balance} projectedBalance={projectedBalance} />
          </div>

          {/* Summary Cards */}
          <div className="mb-8">
            <SummaryCards totalIncome={totalIncome} totalExpenses={totalExpenses} />
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
              />
            )}
            {pendingIncomeCategories.length > 0 && (
              <CategoryBreakdown 
                categories={pendingIncomeCategories} 
                type="income" 
                isPending={true}
                transactions={pendingTransactions}
                onEditTransaction={handleEditTransaction}
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

        {/* Initial Balance Dialog */}
        <InitialBalanceDialog
          isOpen={showInitialBalanceDialog}
          onSave={handleSaveInitialBalance}
        />

        {/* Balance Comparison Modal */}
        <BalanceComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          bankBalance={bankBalance}
          cashBalance={cashBalance}
          categories={data.categories}
          onSaveAdjustments={handleSaveAdjustments}
        />

        {/* Transfer Modal */}
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransfer}
          bankBalance={bankBalance}
          cashBalance={cashBalance}
          transferTransactions={data.transactions.filter(t => t.category === 'Transferencia')}
          onEditTransfer={handleEditTransaction}
          onDeleteTransfer={handleDeleteTransaction}
        />

        {/* Monthly Summary Modal */}
        <MonthlySummaryModal
          isOpen={showMonthlySummary}
          onClose={() => setShowMonthlySummary(false)}
          transactions={data.transactions.filter(t => t.category !== 'Transferencia')}
          onSelectMonth={handleSelectMonth}
        />

        {/* Data Management Modal */}
        <DataManagementModal
          isOpen={showDataManagement}
          onClose={() => setShowDataManagement(false)}
          onDataImported={() => {
            setData(loadData());
            setShowInitialBalanceDialog(false);
          }}
        />

        {/* Category Averages Modal */}
        <CategoryAveragesModal
          isOpen={showCategoryAverages}
          onClose={() => setShowCategoryAverages(false)}
          transactions={data.transactions.filter(t => t.category !== 'Transferencia')}
        />
      </div>
    </>
  );
};

export default Index;
