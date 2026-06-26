import { useState, useMemo } from 'react';
import { Landmark, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { loadData, deleteLoan, applyLoanTransaction, saveData } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import LoanModal from '@/components/LoanModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const LoansPage = () => {
  const [data, setData] = useState(loadData());
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
        isCompleted
      };
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [data]);

  const activeLoans = loanSummaries.filter(l => !l.isCompleted);
  const completedLoans = loanSummaries.filter(l => l.isCompleted);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${name}" y TODAS sus transacciones asociadas?`)) {
      deleteLoan(id);
      setData(loadData());
      toast.success('Financiación eliminada');
    }
  };

  const handleSaveLoan = (loanData: any) => {
    applyLoanTransaction(loanData);
    setData(loadData());
    setIsModalOpen(false);
    toast.success('Préstamo creado correctamente');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Préstamos y Financiaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tus pagos a plazos y préstamos
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-full shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Préstamo</span>
        </Button>
      </div>

      {loanSummaries.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-card">
          <Landmark className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No hay financiaciones activas</h3>
          <p className="text-muted-foreground mb-6">
            Añade un préstamo aquí o fracciona un gasto desde la página principal.
          </p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            Añadir mi primer préstamo
          </Button>
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
                  <LoanCard key={loan.id} loan={loan} onDelete={() => handleDelete(loan.id, loan.name)} />
                ))}
              </div>
            </div>
          )}

          {completedLoans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Completados</h2>
              <div className="grid gap-4 md:grid-cols-2 opacity-75">
                {completedLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} onDelete={() => handleDelete(loan.id, loan.name)} />
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

const LoanCard = ({ loan, onDelete }: { loan: any, onDelete: () => void }) => {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border relative overflow-hidden group">
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
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

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
              {format(parseISO(loan.startDate), "MMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoansPage;
