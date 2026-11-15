import { useState, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X as XIcon,
  Home,
  Link2,
  RefreshCw,
  Sparkles,
  CalendarClock,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { parseAmount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appToast as toast, swalConfirm } from "@/lib/swal";
import LoanModal from '@/components/LoanModal';
import { addDays, format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { MortgageMetadata, RecurringExpenseRule, Transaction } from '@/types/finance';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useLoans } from '@/hooks/useLoans';
import { useRecurringRules } from '@/hooks/useRecurringRules';

const LoansPage = () => {
  const { accounts, isLoading: isAccLoading } = useAccounts();
  const { transactions, updateTransaction, isLoading: isTxLoading } = useTransactions();
  const { loans, deleteLoan, applyLoanTransaction, updateLoan, isLoading: isLoansLoading } = useLoans();
  const { rules: recurringRules, updateRule, deleteRule, isLoading: isRulesLoading } = useRecurringRules();

  const data = useMemo(() => ({
    accounts,
    transactions,
    loans
  }), [accounts, transactions, loans]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const matchingMortgageRule = useMemo(() => {
    const expenseRules = recurringRules.filter((r) => r.type === 'expense');
    return (
      expenseRules.find((r) => r.name.toLowerCase().includes('hipoteca')) ||
      expenseRules.find((r) => Math.abs(r.amount - 743.19) < 0.01)
    );
  }, [recurringRules]);

  const matchingBbvaAccount = useMemo(
    () =>
      accounts.find((a) => a.name.toLowerCase().includes('bbva')) ||
      (matchingMortgageRule
        ? accounts.find((a) => a.id === matchingMortgageRule.accountId)
        : undefined) ||
      accounts[0],
    [accounts, matchingMortgageRule]
  );

  // Group loans and calculate progress
  const loanSummaries = useMemo(() => {
    const loansList = data.loans || [];
    return loansList
      .map((loan) => {
        const meta = loan.originalTransactionData as MortgageMetadata | undefined;
        const isMortgage = Boolean(meta && meta.isMortgage);

        if (isMortgage && meta) {
          const rule = meta.linkedRuleId
            ? recurringRules.find((r) => r.id === meta.linkedRuleId)
            : undefined;

          const isMortgagePaymentTx = (t: Transaction) => {
            if (t.type !== 'expense' || t.isIgnored || t.amount <= 0) return false;
            if (t.date < meta.baselineDate) return false;
            if (t.linkedLoanId === loan.id || t.id.startsWith(`rec_loan_${loan.id}_`)) return true;
            if (meta.linkedRuleId && t.id.startsWith(`rec_${meta.linkedRuleId}_`)) {
              return true;
            }
            if (!meta.linkedRuleId || !rule) {
              const desc = `${t.description || ''} ${t.category || ''}`.toLowerCase();
              if (t.accountId === loan.accountId && desc.includes('hipoteca')) {
                return true;
              }
            }
            return false;
          };

          const relatedTxs = data.transactions
            .filter(isMortgagePaymentTx)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const confirmedTxs = relatedTxs.filter((t) => !t.isPending);
          const pendingTxs = relatedTxs.filter((t) => t.isPending);
          const confirmedCount = confirmedTxs.length;

          const paidInstallments = meta.paidInstallmentsBaseline + confirmedCount;
          const remainingInstallments = Math.max(0, loan.installments - paidInstallments);

          const amortizedPrincipal = Number(
            Math.min(
              loan.amount,
              meta.amortizedPrincipalBaseline +
                confirmedCount * (meta.currentPrincipalPortion || 0)
            ).toFixed(2)
          );
          const pendingPrincipal = Number(
            Math.max(0, loan.amount - amortizedPrincipal).toFixed(2)
          );
          const isCompleted =
            remainingInstallments === 0 || pendingPrincipal <= 0 || loan.status === 'completed';
          const progressPercent =
            loan.amount > 0
              ? Math.min(100, Math.max(0, (amortizedPrincipal / loan.amount) * 100))
              : 0;
          const timeProgressPercent =
            loan.installments > 0
              ? Math.min(100, Math.max(0, (paidInstallments / loan.installments) * 100))
              : 0;

          return {
            ...loan,
            isMortgage: true as const,
            mortgageMeta: meta,
            linkedRule: rule,
            totalReal: loan.amount,
            amountPaid: amortizedPrincipal,
            pendingPrincipal,
            paidInstallments,
            remainingInstallments,
            progressPercent,
            timeProgressPercent,
            isCompleted,
            linkedTxs: relatedTxs,
            confirmedTxs,
            pendingTxs,
          };
        }

        const linkedTxs = data.transactions.filter((t) => t.linkedLoanId === loan.id);
        const totalReal = loan.installments * loan.installmentAmount + loan.setupFee;

        // Calculate how much has been paid (all expenses that are not pending)
        const paidTxs = linkedTxs.filter((t) => t.type === "expense" && !t.isPending);
        const amountPaid =
          paidTxs.reduce((acc, t) => acc + t.amount, 0) + (loan.startingPaidAmount || 0);

        const isCompleted = amountPaid >= totalReal || loan.status === "completed";
        const progressPercent =
          totalReal > 0 ? Math.min(100, Math.max(0, (amountPaid / totalReal) * 100)) : 0;

        return {
          ...loan,
          isMortgage: false as const,
          mortgageMeta: undefined,
          linkedRule: undefined,
          totalReal,
          amountPaid,
          pendingPrincipal: Math.max(0, totalReal - amountPaid),
          paidInstallments: paidTxs.length,
          remainingInstallments: Math.max(0, loan.installments - paidTxs.length),
          progressPercent,
          timeProgressPercent: progressPercent,
          isCompleted,
          linkedTxs,
          confirmedTxs: paidTxs,
          pendingTxs: linkedTxs.filter((t) => t.type === "expense" && t.isPending),
        };
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [data, recurringRules]);

  const activeLoans = loanSummaries.filter((l) => !l.isCompleted);
  const completedLoans = loanSummaries.filter((l) => l.isCompleted);
  const hasMortgage = loanSummaries.some((l) => l.isMortgage);

  const deriveBillingDayFromRule = (rule?: RecurringExpenseRule): number => {
    if (!rule?.startDate) return 31;
    const dayPart = parseInt(rule.startDate.split('-')[2] || '', 10);
    if (isNaN(dayPart) || dayPart >= 29 || dayPart < 1) return 31;
    return dayPart;
  };

  const handleDelete = async (
    id: string,
    name: string,
    amountPaid: number,
    isMortgage?: boolean
  ) => {
    if (!isMortgage && amountPaid > 0) {
      toast.error(
        `No puedes eliminar "${name}" porque ya tiene cuotas pagadas. Si necesitas borrarlo, deshace primero los pagos marcándolos como pendientes.`
      );
      return;
    }
    const confirmed = await swalConfirm(
      isMortgage ? '¿Eliminar ficha de hipoteca?' : '¿Eliminar financiación?',
      isMortgage
        ? `Se eliminará "${name}" y sus recibos futuros pendientes. Tus movimientos ya confirmados NO se verán afectados.`
        : `Se eliminará "${name}" y todas sus cuotas asociadas.`,
      'Sí, eliminar'
    );
    if (confirmed) {
      await deleteLoan(id);
      toast.success(isMortgage ? 'Hipoteca eliminada' : 'Financiación eliminada');
    }
  };

  const handleSaveLoan = async (rawLoanData: any) => {
    const { absorbRuleId, ...loanData } = rawLoanData;
    await applyLoanTransaction(loanData);

    let absorbedRuleName: string | undefined;
    if (absorbRuleId) {
      const ruleToDelete = recurringRules.find((r) => r.id === absorbRuleId);
      if (ruleToDelete) {
        absorbedRuleName = ruleToDelete.name;
        await deleteRule(ruleToDelete.id);
      }
    }

    setIsModalOpen(false);
    toast.success(
      loanData.originalTransactionData?.isMortgage
        ? absorbedRuleName
          ? `Hipoteca guardada y regla "${absorbedRuleName}" movida fuera de Gastos Fijos`
          : 'Hipoteca registrada de forma autónoma'
        : 'Préstamo creado correctamente'
    );
  };

  const handleQuickAddMortgage3089 = async () => {
    if (!matchingBbvaAccount) {
      toast.error('Necesitas al menos una cuenta creada para asociar la hipoteca.');
      return;
    }
    const baselineDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const ruleToAbsorb = matchingMortgageRule;
    const metadata: MortgageMetadata = {
      isMortgage: true,
      linkedRuleId: undefined,
      billingDay: 31,
      category: ruleToAbsorb?.category || 'Vivienda',
      pendingPrincipalBaseline: 131163.79,
      amortizedPrincipalBaseline: 22138.61,
      paidInstallmentsBaseline: 201,
      baselineDate,
      currentPrincipalPortion: 223.45,
      currentInterestPortion: 519.74,
      interestRate: 4.755,
      indexSpread: 'Euríbor + 1,90%',
      nextReviewDate: '2027-02-28',
      endDate: '2048-07-31',
      balloonPayment: 30000,
    };

    await applyLoanTransaction({
      name: 'Hipoteca *3089',
      amount: 153302.4,
      accountId: matchingBbvaAccount.id,
      date: baselineDate,
      installments: 462,
      installmentAmount: 743.19,
      firstInstallmentDate: baselineDate,
      setupFee: 0,
      setupFeeDate: baselineDate,
      isStarted: true,
      startingPaidAmount: 22138.61,
      originalTransactionData: metadata,
    });

    if (ruleToAbsorb) {
      await deleteRule(ruleToAbsorb.id);
    }

    toast.success(
      ruleToAbsorb
        ? `Hipoteca *3089 creada y regla "${ruleToAbsorb.name}" quitada de Gastos Fijos`
        : 'Hipoteca *3089 creada de forma autónoma con recibo a fin de mes'
    );
  };

  const handleAbsorbRule = async (loanItem: any, ruleToAbsorb: RecurringExpenseRule) => {
    const confirmed = await swalConfirm(
      '¿Pasar hipoteca a gestión 100% autónoma?',
      `Se copiará la categoría "${ruleToAbsorb.category}" a "${loanItem.name}" y se eliminará "${ruleToAbsorb.name}" de Gastos Fijos. Los recibos futuros se generarán automáticamente desde Préstamos sin duplicarse.`,
      'Sí, pasar a autónoma'
    );
    if (!confirmed) return;

    const currentMeta = loanItem.mortgageMeta as MortgageMetadata;
    const updatedMeta: MortgageMetadata = {
      ...currentMeta,
      linkedRuleId: undefined,
      billingDay: currentMeta.billingDay ?? deriveBillingDayFromRule(ruleToAbsorb),
      category: currentMeta.category || ruleToAbsorb.category || 'Vivienda',
    };

    await updateLoan({
      id: loanItem.id,
      originalTransactionData: updatedMeta,
    } as any);
    await deleteRule(ruleToAbsorb.id);
    toast.success(`"${ruleToAbsorb.name}" quitada de Gastos Fijos. Tu hipoteca ya es 100% autónoma.`);
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    await updateTransaction({ id, ...updates });
  };

  const handleUpdateLoan = async (id: string, updates: Partial<any>) => {
    await updateLoan({ id, ...updates } as any);
    toast.success('Préstamo actualizado');
  };

  const handleUpdateRule = async (rule: RecurringExpenseRule) => {
    await updateRule(rule);
  };

  if (isAccLoading || isTxLoading || isLoansLoading || isRulesLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Préstamos y Financiaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tu hipoteca, préstamos y pagos a plazos
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-full shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Préstamo / Hipoteca</span>
          </Button>
      </div>

      {!hasMortgage && accounts.length > 0 && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Añadir Hipoteca *3089 ({matchingBbvaAccount?.name || 'BBVA'}) en 1 clic
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                131.163,79 € pendientes · 261/462 cuotas · Recibo 743,19 €
                {matchingMortgageRule
                  ? ` · Absorberá "${matchingMortgageRule.name}" y la quitará de Gastos Fijos.`
                  : ' · Gestión autónoma con recibo automático a fin de mes en Inicio.'}
              </p>
            </div>
          </div>
          <Button onClick={handleQuickAddMortgage3089} size="sm" className="gap-1.5 rounded-xl shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cargar Hipoteca *3089</span>
          </Button>
        </div>
      )}

      {loanSummaries.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-card">
          <Landmark className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No hay financiaciones activas</h3>
          <p className="text-muted-foreground mb-6">
            Añade un préstamo o vincula tu hipoteca aquí, o fracciona un gasto desde Inicio.
          </p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
              Añadir mi primer préstamo o hipoteca
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
                  <div key={loan.id} className={loan.isMortgage ? "md:col-span-2" : undefined}>
                    <LoanCard
                      loan={loan}
                      recurringRules={recurringRules}
                      matchingMortgageRule={matchingMortgageRule}
                      onDelete={() => handleDelete(loan.id, loan.name, loan.amountPaid, loan.isMortgage)}
                      onUpdateTx={handleUpdateTransaction}
                      onUpdateLoan={handleUpdateLoan}
                      onUpdateRule={handleUpdateRule}
                      onAbsorbRule={handleAbsorbRule}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedLoans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Completados</h2>
              <div className="grid gap-4 md:grid-cols-2 opacity-75">
                {completedLoans.map((loan) => (
                  <div key={loan.id} className={loan.isMortgage ? "md:col-span-2" : undefined}>
                    <LoanCard
                      loan={loan}
                      recurringRules={recurringRules}
                      matchingMortgageRule={matchingMortgageRule}
                      onDelete={() => handleDelete(loan.id, loan.name, loan.amountPaid, loan.isMortgage)}
                      onUpdateTx={handleUpdateTransaction}
                      onUpdateLoan={handleUpdateLoan}
                      onUpdateRule={handleUpdateRule}
                      onAbsorbRule={handleAbsorbRule}
                    />
                  </div>
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
        recurringRules={recurringRules}
      />
    </div>
  );
};

const LoanCard = ({
  loan,
  recurringRules,
  matchingMortgageRule,
  onDelete,
  onUpdateTx,
  onUpdateLoan,
  onUpdateRule,
  onAbsorbRule,
}: {
  loan: any;
  recurringRules: RecurringExpenseRule[];
  matchingMortgageRule?: RecurringExpenseRule;
  onDelete: () => void;
  onUpdateTx: (id: string, updates: Partial<Transaction>) => void;
  onUpdateLoan: (id: string, updates: Partial<any>) => Promise<void> | void;
  onUpdateRule: (rule: RecurringExpenseRule) => Promise<void>;
  onAbsorbRule: (loan: any, rule: RecurringExpenseRule) => Promise<void>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingLoan, setIsEditingLoan] = useState(false);

  // Regular loan editing fields
  const [editStartDate, setEditStartDate] = useState(loan.startDate || "");
  const [editStartingPaid, setEditStartingPaid] = useState((loan.startingPaidAmount || 0).toString());

  // Mortgage review / edit fields
  const meta: MortgageMetadata | undefined = loan.mortgageMeta;
  const [editLinkedRuleId, setEditLinkedRuleId] = useState(meta?.linkedRuleId || "none");
  const [editBillingDay, setEditBillingDay] = useState((meta?.billingDay ?? 31).toString());
  const [editCategory, setEditCategory] = useState(meta?.category || "Vivienda");
  const [editReceipt, setEditReceipt] = useState((loan.installmentAmount || 0).toString());
  const [editPrincipalPortion, setEditPrincipalPortion] = useState(
    (meta?.currentPrincipalPortion || 0).toString()
  );
  const [editInterestPortion, setEditInterestPortion] = useState(
    (meta?.currentInterestPortion || 0).toString()
  );
  const [editPendingPrincipal, setEditPendingPrincipal] = useState(
    (loan.pendingPrincipal ?? 0).toString()
  );
  const [editRemainingInstallments, setEditRemainingInstallments] = useState(
    (loan.remainingInstallments ?? 0).toString()
  );
  const [editInterestRate, setEditInterestRate] = useState(
    meta?.interestRate !== undefined ? meta.interestRate.toString() : ""
  );
  const [editNextReviewDate, setEditNextReviewDate] = useState(meta?.nextReviewDate || "");

  const expenseRules = useMemo(
    () => recurringRules.filter((r) => r.type === 'expense'),
    [recurringRules]
  );

  const openEditor = () => {
    if (loan.isMortgage && meta) {
      setEditLinkedRuleId(meta.linkedRuleId || "none");
      setEditBillingDay((meta.billingDay ?? 31).toString());
      setEditCategory(meta.category || "Vivienda");
      setEditReceipt((loan.installmentAmount || 0).toString());
      setEditPrincipalPortion((meta.currentPrincipalPortion || 0).toString());
      setEditInterestPortion((meta.currentInterestPortion || 0).toString());
      setEditPendingPrincipal((loan.pendingPrincipal ?? 0).toFixed(2));
      setEditRemainingInstallments((loan.remainingInstallments ?? 0).toString());
      setEditInterestRate(meta.interestRate !== undefined ? meta.interestRate.toString() : "");
      setEditNextReviewDate(meta.nextReviewDate || "");
    } else {
      setEditStartDate(loan.startDate || "");
      setEditStartingPaid((loan.startingPaidAmount || 0).toString());
    }
    setIsEditingLoan((prev) => !prev);
  };

  const handleSaveLoan = async () => {
    if (loan.isMortgage && meta) {
      const newReceipt = parseAmount(editReceipt);
      const newPrincipalPart = parseAmount(editPrincipalPortion || "0");
      const newInterestPart = parseAmount(editInterestPortion || "0");
      const newPending = parseAmount(editPendingPrincipal);
      const newRemaining = parseInt(editRemainingInstallments, 10);
      const newRate = editInterestRate ? parseAmount(editInterestRate) : undefined;

      if (
        isNaN(newReceipt) ||
        newReceipt <= 0 ||
        isNaN(newPending) ||
        newPending < 0 ||
        newPending > loan.amount ||
        isNaN(newRemaining) ||
        newRemaining < 0 ||
        newRemaining > loan.installments
      ) {
        toast.error("Revisa los valores de revisión de la hipoteca.");
        return;
      }

      const amortizedBaseline = Number(Math.max(0, loan.amount - newPending).toFixed(2));
      const paidBaseline = Math.max(0, loan.installments - newRemaining);

      // Advance baselineDate only past already-confirmed receipts so they aren't double-counted
      let nextBaselineDate = meta.baselineDate;
      if (loan.confirmedTxs && loan.confirmedTxs.length > 0) {
        const lastConfirmedDate = loan.confirmedTxs[loan.confirmedTxs.length - 1].date;
        nextBaselineDate = format(addDays(parseISO(lastConfirmedDate), 1), "yyyy-MM-dd");
      }

      const parsedBillingDay = Math.min(31, Math.max(1, parseInt(editBillingDay, 10) || 31));
      const cleanedCategory = editCategory.trim() || "Vivienda";

      const updatedMeta: MortgageMetadata = {
        ...meta,
        linkedRuleId: editLinkedRuleId !== "none" ? editLinkedRuleId : undefined,
        billingDay: parsedBillingDay,
        category: cleanedCategory,
        pendingPrincipalBaseline: Number(newPending.toFixed(2)),
        amortizedPrincipalBaseline: amortizedBaseline,
        paidInstallmentsBaseline: paidBaseline,
        baselineDate: nextBaselineDate,
        currentPrincipalPortion: isNaN(newPrincipalPart) ? 0 : Number(newPrincipalPart.toFixed(2)),
        currentInterestPortion: isNaN(newInterestPart) ? 0 : Number(newInterestPart.toFixed(2)),
        interestRate: newRate !== undefined && !isNaN(newRate) ? newRate : undefined,
        nextReviewDate: editNextReviewDate || undefined,
      };

      await onUpdateLoan(loan.id, {
        installmentAmount: newReceipt,
        startingPaidAmount: amortizedBaseline,
        originalTransactionData: updatedMeta,
      });

      const targetRuleId = editLinkedRuleId !== "none" ? editLinkedRuleId : undefined;
      const targetRule = targetRuleId
        ? recurringRules.find((r) => r.id === targetRuleId)
        : undefined;
      if (targetRule && Math.abs(targetRule.amount - newReceipt) > 0.005) {
        await onUpdateRule({
          ...targetRule,
          amount: newReceipt,
        });
        toast.success(
          `Revisión guardada y Gasto Fijo "${targetRule.name}" actualizado a ${formatCurrency(newReceipt)}`
        );
      } else if (!targetRule) {
        toast.success("Revisión guardada y recibos futuros actualizados");
      }

      setIsEditingLoan(false);
      return;
    }

    await onUpdateLoan(loan.id, {
      startDate: editStartDate,
      startingPaidAmount: parseAmount(editStartingPaid),
    });
    setIsEditingLoan(false);
  };

  // Filter linkedTxs to only show expenses (installments and fees) sorted by date
  const expenses = useMemo(() => {
    return [...(loan.linkedTxs || [])]
      .filter((t: any) => t.type === 'expense')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [loan.linkedTxs]);

  if (loan.isMortgage && meta) {
    const receiptTotal = meta.currentPrincipalPortion + meta.currentInterestPortion;
    const principalSharePct =
      receiptTotal > 0 ? (meta.currentPrincipalPortion / receiptTotal) * 100 : 0;
    const interestSharePct = receiptTotal > 0 ? 100 - principalSharePct : 0;
    const nextPendingTx: Transaction | undefined = loan.pendingTxs?.[0];
    const projectedAmortized = Math.min(
      loan.amount,
      loan.amountPaid + (meta.currentPrincipalPortion || 0)
    );
    const projectedPending = Math.max(0, loan.amount - projectedAmortized);
    const projectedRemaining = Math.max(0, loan.remainingInstallments - 1);

    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border relative overflow-hidden group tabular-nums">
        <div className="p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Hipoteca Variable
                </span>
                {loan.linkedRule ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <Link2 className="w-3 h-3" />
                    Regla en Gastos Fijos: {loan.linkedRule.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Home className="w-3 h-3" />
                    Autónoma · {meta.billingDay && meta.billingDay < 31 ? `Día ${meta.billingDay}` : 'Fin de mes'} · {meta.category || 'Vivienda'}
                  </span>
                )}
                {(meta.interestRate !== undefined || meta.indexSpread) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    <Percent className="w-3 h-3" />
                    {meta.interestRate !== undefined ? `TIN ${meta.interestRate}%` : ''}
                    {meta.interestRate !== undefined && meta.indexSpread ? ' · ' : ''}
                    {meta.indexSpread || ''}
                  </span>
                )}
                {meta.nextReviewDate && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                    <CalendarClock className="w-3 h-3" />
                    Revisión: {format(parseISO(meta.nextReviewDate), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Home className="w-5 h-5 text-primary shrink-0" />
                <span>{loan.name}</span>
              </h3>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-start">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={openEditor}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isEditingLoan ? 'Cerrar revisión' : 'Revisión / Editar'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {(loan.linkedRule || (!meta.linkedRuleId && matchingMortgageRule)) && !isEditingLoan && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <p className="text-xs text-amber-900 dark:text-amber-200">
                {loan.linkedRule
                  ? `Tu hipoteca sigue dependiendo de "${loan.linkedRule.name}" en Gastos Fijos. Muévela aquí para que Gastos Fijos quede solo para recibos y suscripciones.`
                  : `Todavía existe "${matchingMortgageRule?.name}" en Gastos Fijos. Quítala de allí para gestionar la hipoteca 100% aquí sin duplicados.`}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold shrink-0 border-amber-500/40 bg-background hover:bg-amber-500/15"
                onClick={() =>
                  onAbsorbRule(loan, (loan.linkedRule || matchingMortgageRule)!)
                }
              >
                {loan.linkedRule ? 'Pasar a autónoma y quitar' : 'Quitar de Gastos Fijos'}
              </Button>
            </div>
          )}

          {isEditingLoan ? (
            <div className="space-y-4 bg-muted/40 p-4 rounded-xl border border-border/60">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Día de cobro mensual</Label>
                  <Select value={editBillingDay} onValueChange={setEditBillingDay}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue placeholder="Día de cobro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="31">Último día del mes (30/31)</SelectItem>
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          Día {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Categoría en Inicio</Label>
                  <Input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="Vivienda"
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Regla en Gastos Fijos</Label>
                  <Select value={editLinkedRuleId} onValueChange={setEditLinkedRuleId}>
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue placeholder="Gestión autónoma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Autónoma (sin Gasto Fijo)</SelectItem>
                      {expenseRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.name} ({formatCurrency(rule.amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Recibo mensual (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editReceipt}
                    onChange={(e) => setEditReceipt(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Principal del recibo (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editPrincipalPortion}
                    onChange={(e) => setEditPrincipalPortion(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Intereses del recibo (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editInterestPortion}
                    onChange={(e) => setEditInterestPortion(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Capital pendiente (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editPendingPrincipal}
                    onChange={(e) => setEditPendingPrincipal(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cuotas pendientes</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={editRemainingInstallments}
                    onChange={(e) => setEditRemainingInstallments(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">TIN (%)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editInterestRate}
                    onChange={(e) => setEditInterestRate(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Próxima revisión Euríbor</Label>
                  <Input
                    type="date"
                    value={editNextReviewDate}
                    onChange={(e) => setEditNextReviewDate(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Si modificas el recibo mensual con un Gasto Fijo vinculado, también se actualizará su importe en Gastos Fijos.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="ghost" onClick={() => setIsEditingLoan(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveLoan}>
                  Guardar revisión
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Dual Progress Bars: Capital & Term */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground font-medium">
                      Capital amortizado ({loan.progressPercent.toFixed(1)}%)
                    </span>
                    <span className="font-bold">
                      {formatCurrency(loan.amountPaid)} / {formatCurrency(loan.amount)}
                    </span>
                  </div>
                  <Progress value={loan.progressPercent} className="h-2.5" />
                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                    <span className="font-bold text-foreground">
                      Pendiente hoy: {formatCurrency(loan.pendingPrincipal)}
                    </span>
                    {meta.balloonPayment && (
                      <span className="text-muted-foreground">
                        Incluye cuota final {formatCurrency(meta.balloonPayment)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground font-medium">
                      Plazo recorrido ({loan.timeProgressPercent.toFixed(1)}%)
                    </span>
                    <span className="font-bold">
                      {loan.paidInstallments} / {loan.installments} cuotas
                    </span>
                  </div>
                  <Progress value={loan.timeProgressPercent} className="h-2.5" />
                  <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                    <span className="font-bold text-foreground">
                      Quedan {loan.remainingInstallments} cuotas
                    </span>
                    {meta.endDate && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Vencimiento: {format(parseISO(meta.endDate), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Installment Breakdown */}
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recibo mensual actual: {formatCurrency(loan.installmentAmount)}
                  </span>
                  {receiptTotal > 0 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Principal {principalSharePct.toFixed(1)}% · Intereses {interestSharePct.toFixed(1)}%
                    </span>
                  )}
                </div>

                {receiptTotal > 0 && (
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${principalSharePct}%` }}
                      title={`Principal: ${formatCurrency(meta.currentPrincipalPortion)}`}
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${interestSharePct}%` }}
                      title={`Intereses: ${formatCurrency(meta.currentInterestPortion)}`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Principal que baja deuda: <strong>{formatCurrency(meta.currentPrincipalPortion)}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Intereses: <strong>{formatCurrency(meta.currentInterestPortion)}</strong>
                    </span>
                  </div>
                </div>

                {loan.remainingInstallments > 0 && meta.currentPrincipalPortion > 0 && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    Tras confirmar el próximo recibo
                    {nextPendingTx ? ` (${format(parseISO(nextPendingTx.date), 'dd/MM/yyyy')})` : ''}:{' '}
                    <strong className="text-foreground">{formatCurrency(projectedAmortized)}</strong> amortizados ·{' '}
                    <strong className="text-foreground">{formatCurrency(projectedPending)}</strong> pendientes ·{' '}
                    <strong className="text-foreground">{projectedRemaining}</strong> cuotas restantes.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div className="bg-muted/30 border-t border-border px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-sm font-semibold">
                Recibos programados desde {format(parseISO(meta.baselineDate), 'dd MMM yyyy', { locale: es })}
              </h4>
              <span className="text-xs text-muted-foreground">
                {loan.linkedRule
                  ? 'Se actualizan desde la regla vinculada en Gastos Fijos'
                  : `Generados automáticamente desde Préstamos (${meta.category || 'Vivienda'})`}
              </span>
            </div>
            {expenses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No hay recibos futuros o confirmados todavía desde la fecha base.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {expenses.slice(0, 12).map((tx: any, idx: number) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-xs sm:text-sm py-1.5 px-2.5 rounded-lg bg-background/60 border border-border/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground text-xs w-6">#{idx + 1}</span>
                      <span className="font-medium">
                        {format(parseISO(tx.date), "dd MMM yyyy", { locale: es })}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tx.isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}
                      >
                        {tx.isPending ? 'Pendiente' : 'Confirmada'}
                      </span>
                    </div>
                    <span className={tx.isPending ? "text-expense font-semibold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
            <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  onClick={openEditor}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
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
              <Input type="text" inputMode="decimal" value={editStartingPaid} onChange={e => setEditStartingPaid(e.target.value)} className="h-8 text-sm" enterKeyHint="done" />
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
               
                onSave={(updates) => onUpdateTx(tx.id, updates)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EditableTransactionRow = ({ tx, index, onSave }: { tx: any, index: number, onSave: (updates: Partial<Transaction>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState(tx.date);
  const [amount, setAmount] = useState(tx.amount.toString());

  const handleSave = () => {
    const numAmount = parseAmount(amount);
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
          type="text" 
          inputMode="decimal"
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 text-xs px-2 w-24"
          enterKeyHint="done"
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
        <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground transition-opacity" 
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
      </div>
    </div>
  );
};

export default LoansPage;
