import { useState, useMemo } from 'react';
import { Landmark, Plus, Trash2, Calendar, AlertCircle, ChevronDown, ChevronUp, Edit2, Check, X as XIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import LoanModal from '@/components/LoanModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '@/types/finance';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useLoans } from '@/hooks/useLoans';
import { useTeam } from '@/contexts/TeamContext';

const LoansPage = () => {
    const { activeRole } = useTeam();
  const { accounts, isLoading: isAccLoading } = useAccounts();
  const { transactions, updateTransaction, isLoading: isTxLoading } = useTransactions();
  const { loans, deleteLoan, applyLoanTransaction, updateLoan, isLoading: isLoansLoading } = useLoans();

  const data = useMemo(() => ({
    accounts,
    transactions,
    loans
  }), [accounts, transactions, loans]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group loans and calculate progress
  const loanSummaries = useMemo(() => {
    const loans = data.loans || [];
    return loans.map((loan) => {
      const linkedTxs = data.transactions.filter(t => t.linkedLoanId === loan.id);
      
      const totalReal = (loan.installments * loan.installmentAmount) + loan.setupFee;
      
      // Calculate how much has been paid (all expenses that are not pending)
      const paidTxs = linkedTxs.filter(t => t.type === "expense" && !t.isPending);
      const amountPaid = paidTxs.reduce((acc, t) => acc + t.amount, 0) + (loan.startingPaidAmount || 0);
      
      const isCompleted = amountPaid >= totalReal || loan.status === "completed";
      const progressPercent = Math.min(100, Math.max(0, (amountPaid / totalReal) * 100));

      return {
        ...loan,
        totalReal,
        amountPaid,
        progressPercent,
        isCompleted,
        linkedTxs
      };
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [data]);

  const activeLoans = loanSummaries.filter(l => !l.isCompleted);
  const completedLoans = loanSummaries.filter(l => l.isCompleted);

  const handleDelete = async (id: string, name: string, amountPaid: number) => {
    if (amountPaid > 0) {
      toast.error(`No puedes eliminar "${name}" porque ya tiene cuotas pagadas. Si necesitas borrarlo, deshace primero los pagos marcándolos como pendientes.`);
      return;
    }
    if (confirm(`¿Estás seguro de que quieres eliminar "${name}" y TODAS sus transacciones asociadas?`)) {
      await deleteLoan(id);
      toast.success('Financiación eliminada');
    }
  };

  const handleSaveLoan = async (loanData: any) => {
    await applyLoanTransaction(loanData);
    setIsModalOpen(false);
    toast.success('Préstamo creado correctamente');
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    await updateTransaction({ id, ...updates });
  };

  const handleUpdateLoan = async (id: string, updates: Partial<any>) => {
    await updateLoan({ id, ...updates } as any);
    toast.success('Préstamo actualizado');
  };

  if (isAccLoading || isTxLoading || isLoansLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Préstamos y Financiaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tus pagos a plazos y préstamos
          </p>
        </div>
        {activeRole === 'admin' && (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-full shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Préstamo</span>
          </Button>
        )}
      </div>

      {loanSummaries.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-card">
          <Landmark className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No hay financiaciones activas</h3>
          <p className="text-muted-foreground mb-6">
            Añade un préstamo aquí o fracciona un gasto desde la página principal.
          </p>
          {activeRole === 'admin' && (
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              Añadir mi primer préstamo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {activeLoans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                En Curso
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} activeRole={activeRole} onDelete={() => handleDelete(loan.id, loan.name, loan.amountPaid)} onUpdateTx={handleUpdateTransaction} onUpdateLoan={handleUpdateLoan} />
                ))}
              </div>
            </div>
          )}

          {completedLoans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Completados</h2>
              <div className="grid gap-4 md:grid-cols-2 opacity-75">
                {completedLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} activeRole={activeRole} onDelete={() => handleDelete(loan.id, loan.name, loan.amountPaid)} onUpdateTx={handleUpdateTransaction} onUpdateLoan={handleUpdateLoan} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <LoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLoan}
        accounts={data.accounts}
      />
    </div>
  );
};

const LoanCard = ({ loan, activeRole, onDelete, onUpdateTx, onUpdateLoan }: { loan: any, activeRole: string | null, onDelete: () => void, onUpdateTx: (id: string, updates: Partial<Transaction>) => void, onUpdateLoan: (id: string, updates: Partial<any>) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingLoan, setIsEditingLoan] = useState(false);
  const [editStartDate, setEditStartDate] = useState(loan.startDate || "");
  const [editStartingPaid, setEditStartingPaid] = useState((loan.startingPaidAmount || 0).toString());

  const handleSaveLoan = () => {
    onUpdateLoan(loan.id, {
      startDate: editStartDate,
      startingPaidAmount: parseFloat(editStartingPaid) || 0
    });
    setIsEditingLoan(false);
  };

  // Filter linkedTxs to only show expenses (installments and fees) sorted by date
  const expenses = useMemo(() => {
    return [...(loan.linkedTxs || [])]
      .filter((t: any) => t.type === 'expense')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [loan.linkedTxs]);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border relative overflow-hidden group">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${loan.type === 'loan' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                {loan.type === 'loan' ? 'Préstamo' : 'Fraccionamiento'}
              </span>
              {loan.isCompleted && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Pagado
                </span>
              )}
            </div>
            <h3 className="font-semibold text-lg line-clamp-1">{loan.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            {activeRole === 'admin' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditingLoan(!isEditingLoan)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {isEditingLoan ? (
          <div className="space-y-4 mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Fecha de Inicio</label>
              <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cantidad ya pagada inicial (€)</label>
              <Input type="number" step="0.01" value={editStartingPaid} onChange={e => setEditStartingPaid(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditingLoan(false)}>Cancelar</Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleSaveLoan}>Guardar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">
                  {formatCurrency(loan.amountPaid)} / {formatCurrency(loan.totalReal)}
                </span>
              </div>
              <Progress value={loan.progressPercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cuotas</p>
                <p className="font-medium text-sm">
                  {loan.installments} x {formatCurrency(loan.installmentAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Inicio de Pagos</p>
                <p className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {loan.startDate ? format(parseISO(loan.startDate), "MMM yyyy", { locale: es }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-muted/30 border-t border-border px-5 py-4 space-y-3">
          <h4 className="text-sm font-semibold mb-2">Detalle de cuotas</h4>
          <div className="space-y-2">
            {expenses.map((tx: any, idx: number) => (
              <EditableTransactionRow 
                key={tx.id} 
                tx={tx} 
                index={idx + 1}
                activeRole={activeRole}
                onSave={(updates) => onUpdateTx(tx.id, updates)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EditableTransactionRow = ({ tx, index, activeRole, onSave }: { tx: any, index: number, activeRole: string | null, onSave: (updates: Partial<Transaction>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState(tx.date);
  const [amount, setAmount] = useState(tx.amount.toString());

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && date) {
      onSave({ date, amount: numAmount });
      setIsEditing(false);
      toast.success("Cuota actualizada");
    } else {
      toast.error("Datos inválidos");
    }
  };

  const isFee = tx.category === "Gastos Financieros";

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 bg-background p-2 rounded-md border border-border text-sm">
        <Input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="h-8 text-xs px-2"
        />
        <Input 
          type="number" 
          step="0.01"
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 text-xs px-2 w-24"
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 shrink-0" onClick={handleSave}>
          <Check className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0" onClick={() => setIsEditing(false)}>
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm py-1.5 px-2 hover:bg-muted/50 rounded-md group">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-xs w-5">{isFee ? '-' : index}</span>
        <span className="font-medium">{format(parseISO(tx.date), "dd MMM yyyy", { locale: es })}</span>
        {isFee && <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Comisión</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={tx.isPending ? "text-red-500 font-medium" : "text-emerald-500 font-semibold"}>
          {formatCurrency(tx.amount)}
        </span>
        {activeRole === 'admin' && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" 
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default LoansPage;
