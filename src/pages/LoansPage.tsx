import { useState, useMemo, useEffect, useRef } from 'react';
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
  CreditCard,
  Dog,
  Car,
  ShieldCheck,
  TrendingDown,
  Lightbulb,
  Wallet,
  PiggyBank,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, calculateAccountBalance } from '@/lib/calculations';
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
import { addDays, addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Account, MortgageMetadata, RecurringExpenseRule, Transaction } from '@/types/finance';
import { AmortizeLoanParams } from '@/api/local/loans';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useLoans } from '@/hooks/useLoans';
import { useRecurringRules } from '@/hooks/useRecurringRules';

const isExtraAmortizationTx = (t: Transaction): boolean =>
  String(t.id || '').startsWith('amort_') ||
  String(t.description || '').toLowerCase().includes('amortización anticipada') ||
  String(t.description || '').toLowerCase().includes('amortización parcial');

const calcFrenchReceipt = (
  principal: number,
  months: number,
  monthlyRate: number,
  balloon: number
): number => {
  if (principal <= 0) return 0;
  if (months <= 0) return principal;
  if (monthlyRate <= 0) {
    return Math.max(0, (principal - balloon) / months);
  }
  const discountFactor = Math.pow(1 + monthlyRate, -months);
  const pvBalloon = balloon * discountFactor;
  const pvToAmortize = Math.max(0, principal - pvBalloon);
  const denom = 1 - discountFactor;
  if (denom <= 0) return principal * monthlyRate;
  return (pvToAmortize * monthlyRate) / denom;
};

const simulateMortgageAmortization = ({
  currentPending,
  currentReceipt,
  currentRemainingInstallments,
  amortizeAmount,
  tinPercent,
  balloonPayment = 0,
  strategy,
}: {
  currentPending: number;
  currentReceipt: number;
  currentRemainingInstallments: number;
  amortizeAmount: number;
  tinPercent?: number;
  balloonPayment?: number;
  strategy: 'reduce_quota' | 'reduce_term';
}) => {
  const clampedAmort = Math.max(0, Math.min(currentPending, amortizeAmount));
  const newPending = Number(Math.max(0, currentPending - clampedAmort).toFixed(2));
  const r = tinPercent && tinPercent > 0 ? tinPercent / 100 / 12 : 0;
  const annualInterestSaved =
    tinPercent && tinPercent > 0
      ? Number((clampedAmort * (tinPercent / 100)).toFixed(2))
      : 0;

  if (newPending <= 0.01) {
    return {
      newPending: 0,
      newReceipt: 0,
      newRemainingInstallments: 0,
      newInterestPortion: 0,
      newPrincipalPortion: 0,
      annualInterestSaved,
    };
  }

  const oldBalloon = Math.min(balloonPayment || 0, currentPending);
  const newBalloon = Math.min(balloonPayment || 0, newPending);
  const n = Math.max(1, currentRemainingInstallments || 1);

  const oldCalc = calcFrenchReceipt(currentPending, n, r, oldBalloon);
  const scale = currentReceipt > 0 && oldCalc > 0 ? currentReceipt / oldCalc : 1;

  let nextRemaining = n;
  let nextReceipt = currentReceipt;

  if (strategy === 'reduce_quota') {
    const rawNewReceipt =
      r > 0
        ? calcFrenchReceipt(newPending, n, r, newBalloon) * scale
        : currentPending > 0
        ? currentReceipt * (newPending / currentPending)
        : 0;
    const minInterestOnly = Number((newPending * r).toFixed(2));
    nextReceipt = Number(Math.max(minInterestOnly, rawNewReceipt).toFixed(2));
  } else {
    // Reduce term keeping receipt <= currentReceipt
    if (r > 0 && currentReceipt > newPending * r) {
      let lo = 1;
      let hi = n;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const est = calcFrenchReceipt(newPending, mid, r, newBalloon) * scale;
        if (est <= currentReceipt + 0.05) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
      nextRemaining = lo;
      const adjustedReceipt = calcFrenchReceipt(newPending, nextRemaining, r, newBalloon) * scale;
      nextReceipt = Number(Math.min(currentReceipt, adjustedReceipt).toFixed(2));
    } else if (currentPending > 0) {
      nextRemaining = Math.max(1, Math.round(n * (newPending / currentPending)));
    }
  }

  const newInterestPortion = Number((newPending * r).toFixed(2));
  const newPrincipalPortion = Number(Math.max(0, nextReceipt - newInterestPortion).toFixed(2));

  return {
    newPending,
    newReceipt: nextReceipt,
    newRemainingInstallments: nextRemaining,
    newInterestPortion,
    newPrincipalPortion,
    annualInterestSaved,
  };
};

export interface LoansSectionProps {
  embedded?: boolean;
  searchQuery?: string;
  externalModalOpen?: boolean;
  onExternalModalClose?: () => void;
  onExternalModalOpen?: () => void;
}

export const LoansSection = ({
  embedded = false,
  searchQuery = '',
  externalModalOpen,
  onExternalModalClose,
  onExternalModalOpen,
}: LoansSectionProps) => {
  const { accounts, isLoading: isAccLoading } = useAccounts();
  const { transactions, updateTransaction, isLoading: isTxLoading } = useTransactions();
  const { loans, deleteLoan, applyLoanTransaction, updateLoan, amortizeLoan, isLoading: isLoansLoading } = useLoans();
  const { rules: recurringRules, updateRule, deleteRule, isLoading: isRulesLoading } = useRecurringRules();

  const data = useMemo(() => ({
    accounts,
    transactions,
    loans
  }), [accounts, transactions, loans]);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [amortizeTargetId, setAmortizeTargetId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const focusAmortizeLoan = (loanId: string) => {
    setAmortizeTargetId(loanId);
    const el = cardRefs.current[loanId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const openModal = () => {
    if (onExternalModalOpen) {
      onExternalModalOpen();
    } else {
      setInternalModalOpen(true);
    }
  };
  const closeModal = () => {
    if (onExternalModalClose) {
      onExternalModalClose();
    } else {
      setInternalModalOpen(false);
    }
  };

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

          const allRelatedTxs = data.transactions
            .filter(isMortgagePaymentTx)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const extraAmortizationTxs = data.transactions
            .filter(
              (t) =>
                t.type === 'expense' &&
                !t.isIgnored &&
                !t.isPending &&
                t.linkedLoanId === loan.id &&
                isExtraAmortizationTx(t)
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const relatedTxs = allRelatedTxs.filter((t) => !isExtraAmortizationTx(t));
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

          const displayTxs = [...relatedTxs, ...extraAmortizationTxs].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

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
            linkedTxs: displayTxs,
            confirmedTxs,
            pendingTxs,
            pendingImplicitInterest:
              meta.interestRate && pendingPrincipal > 0
                ? Number(((pendingPrincipal * meta.interestRate) / 100).toFixed(2))
                : 0,
            implicitRatePct: meta.interestRate || 0,
            hasExtraAmortization: extraAmortizationTxs.length > 0,
          };
        }

        const linkedTxs = data.transactions.filter((t) => t.linkedLoanId === loan.id);
        const totalReal = loan.installments * loan.installmentAmount + loan.setupFee;

        // Calculate how much has been paid (all expenses that are not pending)
        const paidTxs = linkedTxs.filter((t) => t.type === "expense" && !t.isPending);
        const confirmedInstallmentTxs = paidTxs.filter(
          (t) => !t.description?.includes('Comisión apertura') && !isExtraAmortizationTx(t)
        );
        const pendingTxs = linkedTxs
          .filter((t) => t.type === "expense" && t.isPending)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const pendingInstallmentsOnly = pendingTxs.filter(
          (t) => !t.description?.includes('Comisión apertura')
        );
        const pendingSum = Number(
          pendingTxs.reduce((acc, t) => acc + t.amount, 0).toFixed(2)
        );
        const amountPaid = Number(
          (paidTxs.reduce((acc, t) => acc + t.amount, 0) + (loan.startingPaidAmount || 0)).toFixed(2)
        );

        const isCompleted =
          loan.status === "completed" ||
          (pendingTxs.length === 0 && (amountPaid > 0 || confirmedInstallmentTxs.length > 0)) ||
          amountPaid >= totalReal;

        const pendingPrincipal = isCompleted
          ? 0
          : pendingTxs.length > 0
          ? pendingSum
          : Math.max(0, Number((totalReal - amountPaid).toFixed(2)));
        const remainingInstallments = isCompleted ? 0 : pendingInstallmentsOnly.length;
        const effectiveTotal = isCompleted
          ? amountPaid
          : Number((amountPaid + pendingPrincipal).toFixed(2));
        const progressPercent = isCompleted
          ? 100
          : effectiveTotal > 0
          ? Math.min(100, Math.max(0, (amountPaid / effectiveTotal) * 100))
          : 0;

        const totalImplicitInterest = Math.max(
          0,
          Number((totalReal - loan.amount - (loan.setupFee || 0)).toFixed(2))
        );
        const pendingImplicitInterest =
          !isCompleted && loan.installments > 0
            ? Number(
                (totalImplicitInterest * (remainingInstallments / loan.installments)).toFixed(2)
              )
            : 0;
        const estimatedPrincipalRemaining = Math.max(
          0,
          Number((pendingPrincipal - pendingImplicitInterest).toFixed(2))
        );
        const implicitRatePct =
          estimatedPrincipalRemaining > 0 && pendingImplicitInterest > 0
            ? Number(((pendingImplicitInterest / estimatedPrincipalRemaining) * 100).toFixed(1))
            : 0;

        return {
          ...loan,
          isMortgage: false as const,
          mortgageMeta: undefined,
          linkedRule: undefined,
          totalReal,
          amountPaid,
          pendingPrincipal,
          paidInstallments: confirmedInstallmentTxs.length,
          remainingInstallments,
          progressPercent,
          timeProgressPercent: progressPercent,
          isCompleted,
          linkedTxs,
          confirmedTxs: paidTxs,
          pendingTxs,
          pendingImplicitInterest,
          implicitRatePct,
          hasExtraAmortization: paidTxs.some(isExtraAmortizationTx),
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

    closeModal();
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

  const handleAmortizeLoan = async (params: AmortizeLoanParams, successMessage: string) => {
    await amortizeLoan(params);
    setAmortizeTargetId(null);
    toast.success(successMessage);
  };

  if (isAccLoading || isTxLoading || isLoansLoading || isRulesLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleActiveLoans = normalizedQuery
    ? activeLoans.filter((l) => l.name.toLowerCase().includes(normalizedQuery))
    : activeLoans;
  const visibleCompletedLoans = normalizedQuery
    ? completedLoans.filter((l) => l.name.toLowerCase().includes(normalizedQuery))
    : completedLoans;
  const activeMonthlyTotal = activeLoans.reduce(
    (sum, l) => sum + (l.installmentAmount || 0),
    0
  );

  return (
    <div className={embedded ? "space-y-4" : "max-w-4xl mx-auto space-y-6 px-4 pb-20"}>
      {embedded ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 shrink-0" />
              <span>Préstamos e Hipoteca ({visibleActiveLoans.length})</span>
            </h3>
            {activeLoans.length > 0 && (
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                · {formatCurrency(activeMonthlyTotal)} / mes
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openModal}
            className="h-8 text-xs font-bold rounded-xl gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir préstamo / hipoteca</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Préstamos y Financiaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona tu hipoteca, préstamos y pagos a plazos
            </p>
          </div>
          <Button onClick={openModal} className="gap-2 rounded-full shadow-md hover:shadow-lg transition-all">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Préstamo / Hipoteca</span>
            </Button>
        </div>
      )}

      {!hasMortgage && accounts.length > 0 && !normalizedQuery && (
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

      {activeLoans.length > 0 && !normalizedQuery && (
        <AmortizationAdvisor
          activeLoans={activeLoans}
          accounts={accounts}
          transactions={transactions}
          onSelectLoanToAmortize={focusAmortizeLoan}
        />
      )}

      {loanSummaries.length === 0 ? (
        <div className={`text-center ${embedded ? 'py-8' : 'py-12'} px-4 border border-dashed rounded-2xl bg-card`}>
          <Landmark className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-base font-semibold mb-1.5">No hay financiaciones activas</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Añade un préstamo o vincula tu hipoteca aquí, o fracciona un gasto desde Inicio.
          </p>
          <Button onClick={openModal} variant="outline" className="rounded-xl">
              Añadir mi primer préstamo o hipoteca
            </Button>
        </div>
      ) : visibleActiveLoans.length === 0 && visibleCompletedLoans.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed rounded-2xl bg-card text-sm text-muted-foreground">
          No hay préstamos ni hipotecas que coincidan con &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        <div className="space-y-6">
          {visibleActiveLoans.length > 0 && (
            <div className="space-y-3">
              {!embedded && (
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  En Curso
                </h2>
              )}
              <div className="flex flex-col gap-3">
                {visibleActiveLoans.map((loan) => (
                  <div
                    key={loan.id}
                    ref={(el) => {
                      cardRefs.current[loan.id] = el;
                    }}
                  >
                    <LoanCard
                      loan={loan}
                      accounts={accounts}
                      recurringRules={recurringRules}
                      matchingMortgageRule={matchingMortgageRule}
                      forceOpenAmortize={amortizeTargetId === loan.id}
                      onClearForceAmortize={() => {
                        if (amortizeTargetId === loan.id) setAmortizeTargetId(null);
                      }}
                      onDelete={() => handleDelete(loan.id, loan.name, loan.amountPaid, loan.isMortgage)}
                      onUpdateTx={handleUpdateTransaction}
                      onUpdateLoan={handleUpdateLoan}
                      onUpdateRule={handleUpdateRule}
                      onAbsorbRule={handleAbsorbRule}
                      onAmortize={handleAmortizeLoan}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleCompletedLoans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Completados</h2>
              <div className="flex flex-col gap-3 opacity-75">
                {visibleCompletedLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    accounts={accounts}
                    recurringRules={recurringRules}
                    matchingMortgageRule={matchingMortgageRule}
                    onDelete={() => handleDelete(loan.id, loan.name, loan.amountPaid, loan.isMortgage)}
                    onUpdateTx={handleUpdateTransaction}
                    onUpdateLoan={handleUpdateLoan}
                    onUpdateRule={handleUpdateRule}
                    onAbsorbRule={handleAbsorbRule}
                    onAmortize={handleAmortizeLoan}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <LoanModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveLoan}
        accounts={data.accounts}
        recurringRules={recurringRules}
      />
    </div>
  );
};

const LoansPage = () => <LoansSection />;

const AmortizationAdvisor = ({
  activeLoans,
  accounts,
  transactions,
  onSelectLoanToAmortize,
}: {
  activeLoans: any[];
  accounts: Account[];
  transactions: Transaction[];
  onSelectLoanToAmortize: (loanId: string) => void;
}) => {
  const [strategy, setStrategy] = useState<'liquidity' | 'interest'>('liquidity');
  const [isOpen, setIsOpen] = useState(true);

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  const liquidityStats = useMemo(() => {
    const operational = accounts
      .filter((a) => !a.excludeFromTotals)
      .reduce(
        (sum, acc) => sum + calculateAccountBalance(acc, transactions, true, currentMonthKey),
        0
      );
    const savings = accounts
      .filter((a) => a.excludeFromTotals)
      .reduce((sum, acc) => sum + calculateAccountBalance(acc, transactions, false), 0);

    const operationalAvailable = Math.max(0, Number(operational.toFixed(2)));
    const savingsAvailable = Math.max(0, Number(savings.toFixed(2)));
    return {
      operationalRaw: Number(operational.toFixed(2)),
      savingsRaw: Number(savings.toFixed(2)),
      operationalAvailable,
      savingsAvailable,
      totalAvailable: Number((operationalAvailable + savingsAvailable).toFixed(2)),
    };
  }, [accounts, transactions, currentMonthKey]);

  const rankedLoans = useMemo(() => {
    const enriched = activeLoans
      .filter((l) => l.pendingPrincipal > 0)
      .map((l) => {
        const isInsuranceDebit =
          !l.isMortgage && l.name.toLowerCase().includes('seguro');
        const cashflowPer100 =
          l.pendingPrincipal > 0
            ? Number(((l.installmentAmount / l.pendingPrincipal) * 100).toFixed(1))
            : 0;
        const canPayOperational =
          !l.isMortgage && l.pendingPrincipal <= liquidityStats.operationalAvailable;
        const canPayTotal =
          !l.isMortgage && l.pendingPrincipal <= liquidityStats.totalAvailable;
        const interestScore = l.isMortgage
          ? Number(l.mortgageMeta?.interestRate || 0)
          : Number(l.implicitRatePct || 0);

        return {
          ...l,
          isInsuranceDebit,
          cashflowPer100,
          canPayOperational,
          canPayTotal,
          interestScore,
        };
      });

    if (strategy === 'liquidity') {
      return [...enriched].sort((a, b) => {
        if (a.isMortgage !== b.isMortgage) return a.isMortgage ? 1 : -1;
        if (a.isInsuranceDebit !== b.isInsuranceDebit) return a.isInsuranceDebit ? 1 : -1;
        if (a.canPayTotal !== b.canPayTotal) return a.canPayTotal ? -1 : 1;
        if (Math.abs(b.cashflowPer100 - a.cashflowPer100) > 0.1) {
          return b.cashflowPer100 - a.cashflowPer100;
        }
        return a.pendingPrincipal - b.pendingPrincipal;
      });
    }

    return [...enriched].sort((a, b) => {
      if (Math.abs(b.interestScore - a.interestScore) > 0.05) {
        return b.interestScore - a.interestScore;
      }
      if ((b.pendingImplicitInterest || 0) !== (a.pendingImplicitInterest || 0)) {
        return (b.pendingImplicitInterest || 0) - (a.pendingImplicitInterest || 0);
      }
      return b.cashflowPer100 - a.cashflowPer100;
    });
  }, [activeLoans, liquidityStats, strategy]);

  if (rankedLoans.length === 0) return null;

  const topLoan = rankedLoans[0];

  return (
    <div className="bg-card rounded-3xl shadow-sm border border-primary/20 overflow-hidden tabular-nums">
      <div
        className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                Asesor de Amortización
              </h3>
              {topLoan && !topLoan.isMortgage && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Prioridad: {topLoan.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Analiza tu liquidez disponible y te indica qué deuda compensa liquidar antes
            </p>
          </div>
        </div>
        <span className="text-muted-foreground p-1 shrink-0">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {isOpen && (
        <div className="border-t border-border/50 bg-muted/10 p-4 sm:p-5 space-y-4">
          {/* Liquidity & Strategy header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background border border-border/60">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Disponible fin de mes:</span>
                <strong
                  className={
                    liquidityStats.operationalRaw >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {formatCurrency(liquidityStats.operationalRaw)}
                </strong>
              </span>
              {accounts.some((a) => a.excludeFromTotals) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background border border-border/60">
                  <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Ahorro:</span>
                  <strong className="text-foreground">
                    {formatCurrency(liquidityStats.savingsRaw)}
                  </strong>
                </span>
              )}
            </div>

            <div className="inline-flex p-1 rounded-xl bg-muted/70 border border-border/50 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setStrategy('liquidity')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  strategy === 'liquidity'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Liberar cuota / mes
              </button>
              <button
                type="button"
                onClick={() => setStrategy('interest')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  strategy === 'interest'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ahorrar intereses
              </button>
            </div>
          </div>

          {/* Top Callout */}
          {topLoan && (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-foreground">
                  {strategy === 'liquidity'
                    ? `Mejor jugada (Bola de nieve): Liquidar ${topLoan.name}`
                    : `Mayor coste financiero: Priorizar ${topLoan.name}`}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {topLoan.isMortgage ? (
                    <>
                      TIN{' '}
                      <strong className="text-foreground">
                        {topLoan.mortgageMeta?.interestRate || 0}%
                      </strong>{' '}
                      · Pagas{' '}
                      <strong className="text-foreground">
                        {formatCurrency(topLoan.mortgageMeta?.currentInterestPortion || 0)}/mes
                      </strong>{' '}
                      solo en intereses. Cada <strong className="text-foreground">1.000 €</strong>{' '}
                      amortizados ahorran aprox.{' '}
                      <strong className="text-foreground">
                        {formatCurrency(((topLoan.mortgageMeta?.interestRate || 0) / 100) * 1000)}
                        /año
                      </strong>{' '}
                      en intereses.
                    </>
                  ) : (
                    <>
                      Con <strong className="text-foreground">{formatCurrency(topLoan.pendingPrincipal)}</strong>{' '}
                      liberas <strong className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(topLoan.installmentAmount)} / mes</strong>{' '}
                      ({topLoan.cashflowPer100.toFixed(1)} €/mes por cada 100 €)
                      {topLoan.pendingImplicitInterest > 0 && (
                        <>
                          {' '}· incluye <strong className="text-foreground">~{formatCurrency(topLoan.pendingImplicitInterest)}</strong> de recargo futuro ({topLoan.implicitRatePct}%)
                        </>
                      )}
                      .
                    </>
                  )}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-bold rounded-xl shrink-0 gap-1"
                onClick={() => onSelectLoanToAmortize(topLoan.id)}
              >
                <span>{topLoan.isMortgage ? 'Simular amortización' : 'Amortizar ahora'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Comparison list */}
          <div className="space-y-2">
            {rankedLoans.map((item, idx) => {
              const { Icon, color } = getLoanVisual(item);
              let viabilityLabel = '';
              let viabilityClass = '';

              if (item.isMortgage) {
                viabilityLabel =
                  liquidityStats.totalAvailable >= 1000
                    ? 'Viable amort. parcial (+1.000 €)'
                    : 'Objetivo a largo plazo';
                viabilityClass =
                  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
              } else if (item.canPayOperational) {
                viabilityLabel = 'Viable con liquidez del mes';
                viabilityClass =
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
              } else if (item.canPayTotal) {
                viabilityLabel = 'Viable con Ahorro';
                viabilityClass =
                  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
              } else {
                const shortfall = Math.max(
                  0,
                  item.pendingPrincipal - liquidityStats.totalAvailable
                );
                viabilityLabel = `Faltan ${formatCurrency(shortfall)} · Parcial viable`;
                viabilityClass =
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
              }

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-background/80 border border-border/50"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="text-xs font-black text-muted-foreground w-5 shrink-0">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: color || '#3b82f6' }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${viabilityClass}`}
                        >
                          {viabilityLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>
                          Pendiente: <strong className="text-foreground">{formatCurrency(item.pendingPrincipal)}</strong> ({item.remainingInstallments} cuotas)
                        </span>
                        <span>·</span>
                        <span>
                          Cuota: <strong className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(item.installmentAmount)}/mes</strong>
                        </span>
                        {!item.isMortgage && (
                          <>
                            <span>·</span>
                            <span>{item.cashflowPer100.toFixed(1)} €/mes por 100 €</span>
                          </>
                        )}
                        {item.isMortgage ? (
                          <>
                            <span>·</span>
                            <span>
                              TIN {item.mortgageMeta?.interestRate || 0}% ({formatCurrency(item.mortgageMeta?.currentInterestPortion || 0)}/mes intereses)
                            </span>
                          </>
                        ) : item.pendingImplicitInterest > 0 ? (
                          <>
                            <span>·</span>
                            <span>Recargo ~{formatCurrency(item.pendingImplicitInterest)} ({item.implicitRatePct}%)</span>
                          </>
                        ) : item.isInsuranceDebit ? (
                          <>
                            <span>·</span>
                            <span>Recibo seguro domiciliado</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold rounded-xl shrink-0 self-end sm:self-center gap-1"
                    onClick={() => onSelectLoanToAmortize(item.id)}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Amortizar</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const getLoanVisual = (loan: any): { Icon: any; color?: string } => {
  const nameLower = (loan.name || '').toLowerCase();
  if (loan.isMortgage || nameLower.includes('hipoteca')) {
    return { Icon: Home, color: '#e6af19' };
  }
  if (nameLower.includes('tarjeta')) {
    return { Icon: CreditCard, color: '#dc2626' };
  }
  if (nameLower.includes('veterin')) {
    return { Icon: Dog, color: '#d97706' };
  }
  if (nameLower.includes('seguro coche')) {
    return { Icon: Car, color: '#0284c7' };
  }
  if (nameLower.includes('seguro hogar')) {
    return { Icon: ShieldCheck, color: '#0284c7' };
  }
  return { Icon: Landmark };
};

const LoanCard = ({
  loan,
  accounts,
  recurringRules,
  matchingMortgageRule,
  forceOpenAmortize = false,
  onClearForceAmortize,
  onDelete,
  onUpdateTx,
  onUpdateLoan,
  onUpdateRule,
  onAbsorbRule,
  onAmortize,
}: {
  loan: any;
  accounts: Account[];
  recurringRules: RecurringExpenseRule[];
  matchingMortgageRule?: RecurringExpenseRule;
  forceOpenAmortize?: boolean;
  onClearForceAmortize?: () => void;
  onDelete: () => void;
  onUpdateTx: (id: string, updates: Partial<Transaction>) => void;
  onUpdateLoan: (id: string, updates: Partial<any>) => Promise<void> | void;
  onUpdateRule: (rule: RecurringExpenseRule) => Promise<void>;
  onAbsorbRule: (loan: any, rule: RecurringExpenseRule) => Promise<void>;
  onAmortize: (params: AmortizeLoanParams, successMessage: string) => Promise<void>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingLoan, setIsEditingLoan] = useState(false);
  const [isAmortizing, setIsAmortizing] = useState(false);
  const [isSubmittingAmort, setIsSubmittingAmort] = useState(false);

  // Regular loan editing fields
  const [editStartDate, setEditStartDate] = useState(loan.startDate || "");

  // Regular loan amortization fields
  const [amortMode, setAmortMode] = useState<'full' | 'partial_term' | 'partial_installment'>('full');
  const [amortAmount, setAmortAmount] = useState((loan.pendingPrincipal || 0).toFixed(2));
  const [amortDate, setAmortDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amortAccountId, setAmortAccountId] = useState(
    loan.accountId || accounts[0]?.id || ''
  );
  const [recordBankTx, setRecordBankTx] = useState(true);

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

  // Mortgage amortization fields
  const [mortStrategy, setMortStrategy] = useState<'reduce_quota' | 'reduce_term'>('reduce_quota');
  const [mortAmortAmount, setMortAmortAmount] = useState('3000');
  const [mortSimNewReceipt, setMortSimNewReceipt] = useState('');
  const [mortSimNewRemaining, setMortSimNewRemaining] = useState('');
  const [mortSimNewPrincipalPart, setMortSimNewPrincipalPart] = useState('');
  const [mortSimNewInterestPart, setMortSimNewInterestPart] = useState('');

  const initAmortizationForm = () => {
    setIsEditingLoan(false);
    setAmortDate(format(new Date(), 'yyyy-MM-dd'));
    setAmortAccountId(loan.accountId || accounts[0]?.id || '');
    setRecordBankTx(true);

    if (loan.isMortgage && meta) {
      const defaultAmt = Math.min(3000, loan.pendingPrincipal || 3000);
      setMortAmortAmount(defaultAmt.toFixed(0));
      setMortStrategy('reduce_quota');
      const sim = simulateMortgageAmortization({
        currentPending: loan.pendingPrincipal || 0,
        currentReceipt: loan.installmentAmount || 0,
        currentRemainingInstallments: loan.remainingInstallments || 0,
        amortizeAmount: defaultAmt,
        tinPercent: meta.interestRate,
        balloonPayment: meta.balloonPayment,
        strategy: 'reduce_quota',
      });
      setMortSimNewReceipt(sim.newReceipt.toFixed(2));
      setMortSimNewRemaining(sim.newRemainingInstallments.toString());
      setMortSimNewPrincipalPart(sim.newPrincipalPortion.toFixed(2));
      setMortSimNewInterestPart(sim.newInterestPortion.toFixed(2));
    } else {
      setAmortMode('full');
      setAmortAmount((loan.pendingPrincipal || 0).toFixed(2));
    }
  };

  useEffect(() => {
    if (forceOpenAmortize && !loan.isCompleted) {
      setIsExpanded(true);
      initAmortizationForm();
      setIsAmortizing(true);
      onClearForceAmortize?.();
    }
  }, [forceOpenAmortize, loan.isCompleted]);

  const recalcMortgageFields = (amtStr: string, strat: 'reduce_quota' | 'reduce_term') => {
    if (!loan.isMortgage || !meta) return;
    const parsed = parseAmount(amtStr);
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    const sim = simulateMortgageAmortization({
      currentPending: loan.pendingPrincipal || 0,
      currentReceipt: loan.installmentAmount || 0,
      currentRemainingInstallments: loan.remainingInstallments || 0,
      amortizeAmount: val,
      tinPercent: meta.interestRate,
      balloonPayment: meta.balloonPayment,
      strategy: strat,
    });
    setMortSimNewReceipt(sim.newReceipt.toFixed(2));
    setMortSimNewRemaining(sim.newRemainingInstallments.toString());
    setMortSimNewPrincipalPart(sim.newPrincipalPortion.toFixed(2));
    setMortSimNewInterestPart(sim.newInterestPortion.toFixed(2));
  };

  const expenseRules = useMemo(
    () => recurringRules.filter((r) => r.type === 'expense'),
    [recurringRules]
  );

  const openEditor = () => {
    if (loan.isCompleted) return;
    setIsAmortizing(false);
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
    }
    setIsEditingLoan((prev) => !prev);
  };

  const toggleAmortizer = () => {
    if (loan.isCompleted) return;
    if (!isAmortizing) {
      initAmortizationForm();
      setIsAmortizing(true);
    } else {
      setIsAmortizing(false);
    }
  };

  const handleConfirmAmortization = async () => {
    if (loan.isCompleted || isSubmittingAmort) return;
    if (!amortDate || !amortAccountId) {
      toast.error('Selecciona fecha y cuenta bancaria.');
      return;
    }

    if (loan.isMortgage && meta) {
      const parsedAmt = parseAmount(mortAmortAmount);
      const parsedReceipt = parseAmount(mortSimNewReceipt);
      const parsedRemaining = parseInt(mortSimNewRemaining, 10);
      const parsedPrincipal = parseAmount(mortSimNewPrincipalPart || '0');
      const parsedInterest = parseAmount(mortSimNewInterestPart || '0');

      if (
        isNaN(parsedAmt) ||
        parsedAmt <= 0 ||
        parsedAmt > loan.pendingPrincipal + 0.01 ||
        isNaN(parsedReceipt) ||
        parsedReceipt < 0 ||
        isNaN(parsedRemaining) ||
        parsedRemaining < 0
      ) {
        toast.error('Revisa el importe de amortización y las nuevas condiciones.');
        return;
      }

      const newPending = Number(Math.max(0, loan.pendingPrincipal - parsedAmt).toFixed(2));
      const accName = accounts.find((a) => a.id === amortAccountId)?.name || 'tu cuenta';

      const ok = await swalConfirm(
        `¿Amortizar ${formatCurrency(parsedAmt)} de ${loan.name}?`,
        `${recordBankTx ? `Se registrará un cargo de ${formatCurrency(parsedAmt)} en ${accName}. ` : ''}Capital pendiente pasará a ${formatCurrency(newPending)} (${parsedRemaining} cuotas · recibo ${formatCurrency(parsedReceipt)}).`,
        'Sí, amortizar'
      );
      if (!ok) return;

      setIsSubmittingAmort(true);
      try {
        await onAmortize(
          {
            loanId: loan.id,
            mode: 'mortgage',
            amount: parsedAmt,
            date: amortDate,
            accountId: amortAccountId,
            recordTransaction: recordBankTx,
            mortgageUpdates: {
              newReceipt: parsedReceipt,
              newPrincipalPortion: isNaN(parsedPrincipal) ? 0 : parsedPrincipal,
              newInterestPortion: isNaN(parsedInterest) ? 0 : parsedInterest,
              newPendingPrincipal: newPending,
              newRemainingInstallments: parsedRemaining,
            },
          },
          `Amortización de ${formatCurrency(parsedAmt)} aplicada en ${loan.name}`
        );
        setIsAmortizing(false);
      } finally {
        setIsSubmittingAmort(false);
      }
      return;
    }

    // Regular loan or fractionation
    const parsedAmt = parseAmount(amortAmount);
    if (isNaN(parsedAmt) || (recordBankTx && parsedAmt <= 0) || (!recordBankTx && parsedAmt < 0)) {
      toast.error('Introduce un importe válido.');
      return;
    }

    const accName = accounts.find((a) => a.id === amortAccountId)?.name || 'tu cuenta';
    const modeLabel =
      amortMode === 'full'
        ? `Se liquidará "${loan.name}" por completo conservando tus cuotas ya pagadas y eliminando las ${loan.remainingInstallments} cuotas futuras pendientes.`
        : amortMode === 'partial_term'
        ? `Se descontarán ${formatCurrency(parsedAmt)} empezando por las últimas cuotas futuras de "${loan.name}".`
        : `Se reducirán todas las cuotas pendientes de "${loan.name}" descontando ${formatCurrency(parsedAmt)} en total.`;

    const ok = await swalConfirm(
      amortMode === 'full'
        ? `¿Liquidar ${loan.name}?`
        : `¿Amortizar ${formatCurrency(parsedAmt)} de ${loan.name}?`,
      `${recordBankTx ? `Se anotará el pago de ${formatCurrency(parsedAmt)} en ${accName}. ` : ''}${modeLabel}`,
      amortMode === 'full' ? 'Sí, liquidar préstamo' : 'Sí, amortizar'
    );
    if (!ok) return;

    const savingsOnFull =
      amortMode === 'full' && loan.pendingPrincipal > parsedAmt + 0.05
        ? Number((loan.pendingPrincipal - parsedAmt).toFixed(2))
        : 0;

    setIsSubmittingAmort(true);
    try {
      await onAmortize(
        {
          loanId: loan.id,
          mode: amortMode,
          amount: parsedAmt,
          date: amortDate,
          accountId: amortAccountId,
          recordTransaction: recordBankTx,
        },
        amortMode === 'full'
          ? savingsOnFull > 0
            ? `${loan.name} liquidado. Has liberado ${formatCurrency(loan.installmentAmount)}/mes y ahorrado ${formatCurrency(savingsOnFull)}.`
            : `${loan.name} liquidado. Has liberado ${formatCurrency(loan.installmentAmount)}/mes.`
          : `Amortización parcial de ${formatCurrency(parsedAmt)} aplicada a ${loan.name}.`
      );
      setIsAmortizing(false);
    } finally {
      setIsSubmittingAmort(false);
    }
  };

  const handleSaveLoan = async () => {
    if (loan.isCompleted) return;
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
    });
    setIsEditingLoan(false);
  };

  // Filter linkedTxs to only show expenses (installments and fees) sorted by date
  const expenses = useMemo(() => {
    return [...(loan.linkedTxs || [])]
      .filter((t: any) => t.type === 'expense')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [loan.linkedTxs]);

  const computedEndDate = useMemo(() => {
    if (loan.isMortgage && meta?.endDate) return meta.endDate;
    if (!loan.isMortgage) {
      if (loan.pendingTxs && loan.pendingTxs.length > 0) {
        return loan.pendingTxs[loan.pendingTxs.length - 1].date;
      }
      if (loan.isCompleted && loan.confirmedTxs && loan.confirmedTxs.length > 0) {
        const sortedConfirmed = [...loan.confirmedTxs].sort(
          (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return sortedConfirmed[sortedConfirmed.length - 1].date;
      }
    }
    if (!loan.startDate) return undefined;
    try {
      const parsed = parseISO(loan.startDate);
      if (isNaN(parsed.getTime())) return undefined;
      return format(
        addMonths(parsed, Math.max(0, (loan.installments || 1) - 1)),
        'yyyy-MM-dd'
      );
    } catch {
      return undefined;
    }
  }, [
    loan.isMortgage,
    loan.isCompleted,
    loan.pendingTxs,
    loan.confirmedTxs,
    meta?.endDate,
    loan.startDate,
    loan.installments,
  ]);

  const formattedEndDate = useMemo(() => {
    if (!computedEndDate) return 'N/D';
    try {
      return format(parseISO(computedEndDate), 'dd/MM/yyyy');
    } catch {
      return 'N/D';
    }
  }, [computedEndDate]);

  const regularAmortPreview = useMemo(() => {
    if (loan.isMortgage) return null;
    const raw = parseAmount(amortAmount);
    const amt = isNaN(raw) || raw < 0 ? 0 : raw;
    const pendingInstallments = (loan.pendingTxs || []).filter(
      (t: any) => !String(t.description || '').includes('Comisión apertura')
    );
    const pendingCount = pendingInstallments.length;

    let removedCount = 0;
    let rem = amt;
    for (let i = pendingInstallments.length - 1; i >= 0 && rem > 0.005; i--) {
      if (pendingInstallments[i].amount <= rem + 0.005) {
        removedCount++;
        rem = Number((rem - pendingInstallments[i].amount).toFixed(2));
      } else {
        rem = 0;
      }
    }

    const termRemainingCount = Math.max(0, pendingCount - removedCount);
    const newTotal = Math.max(0, Number(((loan.pendingPrincipal || 0) - amt).toFixed(2)));
    const newQuota = pendingCount > 0 ? Number((newTotal / pendingCount).toFixed(2)) : 0;
    const monthlyRelief = Number(Math.max(0, (loan.installmentAmount || 0) - newQuota).toFixed(2));
    const fullSavings =
      loan.pendingPrincipal > amt + 0.05
        ? Number((loan.pendingPrincipal - amt).toFixed(2))
        : 0;

    return {
      amt,
      pendingCount,
      removedCount,
      termRemainingCount,
      newTotal,
      newQuota,
      monthlyRelief,
      fullSavings,
      estimatedWithoutInterest: Math.max(
        0,
        Number(((loan.pendingPrincipal || 0) - (loan.pendingImplicitInterest || 0)).toFixed(2))
      ),
    };
  }, [loan, amortAmount]);

  const mortAmortPreview = useMemo(() => {
    if (!loan.isMortgage || !meta) return null;
    const rawAmt = parseAmount(mortAmortAmount);
    const amt = isNaN(rawAmt) || rawAmt < 0 ? 0 : Math.min(rawAmt, loan.pendingPrincipal || 0);
    const rawReceipt = parseAmount(mortSimNewReceipt);
    const nextReceipt = isNaN(rawReceipt) ? loan.installmentAmount || 0 : rawReceipt;
    const parsedRem = parseInt(mortSimNewRemaining, 10);
    const nextRem = isNaN(parsedRem) ? loan.remainingInstallments || 0 : parsedRem;

    const newPending = Number(Math.max(0, (loan.pendingPrincipal || 0) - amt).toFixed(2));
    const quotaSavings = Number(Math.max(0, (loan.installmentAmount || 0) - nextReceipt).toFixed(2));
    const monthsSaved = Math.max(0, (loan.remainingInstallments || 0) - nextRem);
    const annualInterestSaved =
      meta.interestRate && meta.interestRate > 0
        ? Number((amt * (meta.interestRate / 100)).toFixed(2))
        : 0;

    return {
      amt,
      newPending,
      nextReceipt,
      nextRem,
      quotaSavings,
      monthsSaved,
      annualInterestSaved,
    };
  }, [loan, meta, mortAmortAmount, mortSimNewReceipt, mortSimNewRemaining]);

  const duplicateRule =
    loan.isMortgage && meta
      ? (loan.linkedRule as RecurringExpenseRule | undefined) ||
        (!meta.linkedRuleId ? matchingMortgageRule : undefined)
      : undefined;

  const receiptTotal = meta
    ? meta.currentPrincipalPortion + meta.currentInterestPortion
    : 0;
  const principalSharePct =
    meta && receiptTotal > 0 ? (meta.currentPrincipalPortion / receiptTotal) * 100 : 0;
  const interestSharePct = receiptTotal > 0 ? 100 - principalSharePct : 0;
  const nextPendingTx: Transaction | undefined = loan.pendingTxs?.[0];
  const projectedAmortized = meta
    ? Math.min(loan.amount, loan.amountPaid + (meta.currentPrincipalPortion || 0))
    : 0;
  const projectedPending = meta ? Math.max(0, loan.amount - projectedAmortized) : 0;
  const projectedRemaining = Math.max(0, loan.remainingInstallments - 1);
  const { Icon: LoanIcon, color: loanColor } = getLoanVisual(loan);

  return (
    <div
      className={`bg-card rounded-3xl shadow-sm border relative overflow-hidden transition-all duration-300 tabular-nums ${
        isExpanded ? 'border-primary/35' : 'border-border/50 hover:border-primary/20'
      }`}
    >
      {/* COMPACT SUMMARY ROW */}
      <div
        className="p-4 sm:p-5 space-y-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {loanColor ? (
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm"
                style={{ backgroundColor: loanColor }}
              >
                <LoanIcon className="w-5 h-5" />
              </div>
            ) : (
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  loan.type === 'loan'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                }`}
              >
                <LoanIcon className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-extrabold text-base sm:text-lg truncate text-foreground">
                  {loan.name}
                </p>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    loan.isMortgage
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                      : loan.type === 'loan'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}
                >
                  {loan.isMortgage
                    ? 'Hipoteca'
                    : loan.type === 'loan'
                    ? 'Préstamo'
                    : 'Fraccionamiento'}
                </span>
                {loan.isCompleted && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Pagado
                  </span>
                )}
                {duplicateRule && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Duplicada en Fijos
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                {loan.isCompleted && loan.hasExtraAmortization
                  ? `${loan.paidInstallments} cuotas + amortización · liquidado`
                  : `${loan.paidInstallments} / ${loan.installments} cuotas · quedan ${loan.remainingInstallments}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="font-black text-lg sm:text-xl text-expense leading-none">
                -{formatCurrency(loan.installmentAmount)}
              </p>
              <span className="text-[10px] font-semibold text-muted-foreground">cuota / mes</span>
            </div>
            <span className="text-muted-foreground p-1">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
        </div>

        {/* Key metrics + single compact progress bar */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-muted/40 px-2.5 py-1.5">
              <span className="block text-[10px] font-semibold text-muted-foreground">
                Amortizado
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(loan.amountPaid)}
              </span>
            </div>
            <div className="rounded-xl bg-muted/40 px-2.5 py-1.5">
              <span className="block text-[10px] font-semibold text-muted-foreground">
                Pendiente
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(loan.pendingPrincipal)}
              </span>
            </div>
            <div className="rounded-xl bg-muted/40 px-2.5 py-1.5">
              <span className="block text-[10px] font-semibold text-muted-foreground">
                Fecha fin
              </span>
              <span className="font-bold text-foreground">{formattedEndDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Progress value={loan.progressPercent} className="h-2 flex-1" />
            <span className="text-[11px] font-bold text-muted-foreground shrink-0 w-12 text-right">
              {loan.progressPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* EXPANDED DETAILS */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-muted/15 p-4 sm:p-5 space-y-5 animate-in slide-in-from-top-2">
          {loan.isMortgage && meta ? (
            <>
              {/* Badges & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
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

                {loan.isCompleted ? (
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 self-end sm:self-auto">
                    Pagado · Solo informativo
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    <Button
                      variant={isAmortizing ? "default" : "outline"}
                      size="sm"
                      className={`h-8 gap-1.5 text-xs font-semibold rounded-xl ${
                        isAmortizing
                          ? ''
                          : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                      onClick={toggleAmortizer}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>{isAmortizing ? 'Cerrar amortización' : 'Amortizar'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-semibold rounded-xl"
                      onClick={openEditor}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isEditingLoan ? 'Cerrar revisión' : 'Revisión / Editar'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-xl"
                      onClick={onDelete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {!loan.isCompleted && duplicateRule && !isEditingLoan && !isAmortizing && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    {loan.linkedRule
                      ? `Tu hipoteca sigue dependiendo de "${loan.linkedRule.name}" en Gastos Fijos. Quítala de allí para gestionarla de forma autónoma.`
                      : `Todavía existe "${matchingMortgageRule?.name}" en Suministros/Gastos Fijos. Quítala para evitar duplicados.`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold shrink-0 border-amber-500/40 bg-background hover:bg-amber-500/15 rounded-xl"
                    onClick={() => onAbsorbRule(loan, duplicateRule)}
                  >
                    {loan.linkedRule ? 'Pasar a autónoma y quitar' : 'Quitar duplicado'}
                  </Button>
                </div>
              )}

              {!loan.isCompleted && isAmortizing ? (
                <div className="space-y-4 bg-background/90 p-4 rounded-2xl border border-emerald-500/30">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Amortización anticipada de hipoteca
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Simula el impacto y actualiza el capital pendiente y los próximos recibos.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[1000, 3000, 5000, 10000]
                        .filter((v) => v <= loan.pendingPrincipal)
                        .map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const valStr = preset.toString();
                              setMortAmortAmount(valStr);
                              recalcMortgageFields(valStr, mortStrategy);
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                          >
                            +{preset.toLocaleString('es-ES')} €
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Importe a amortizar (€)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={mortAmortAmount}
                        onChange={(e) => {
                          setMortAmortAmount(e.target.value);
                          recalcMortgageFields(e.target.value, mortStrategy);
                        }}
                        className="h-9 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Objetivo con el banco</Label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50">
                        <button
                          type="button"
                          onClick={() => {
                            setMortStrategy('reduce_quota');
                            recalcMortgageFields(mortAmortAmount, 'reduce_quota');
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                            mortStrategy === 'reduce_quota'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Reducir cuota
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMortStrategy('reduce_term');
                            recalcMortgageFields(mortAmortAmount, 'reduce_term');
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                            mortStrategy === 'reduce_term'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Reducir plazo
                        </button>
                      </div>
                    </div>
                  </div>

                  {mortAmortPreview && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs space-y-1">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold text-foreground">
                        <span>
                          Nuevo capital pendiente:{' '}
                          <strong>{formatCurrency(mortAmortPreview.newPending)}</strong>
                        </span>
                        {mortStrategy === 'reduce_quota' ? (
                          <span className="text-emerald-700 dark:text-emerald-300">
                            Baja tu recibo en -{formatCurrency(mortAmortPreview.quotaSavings)} / mes
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-300">
                            Te quitas {mortAmortPreview.monthsSaved}{' '}
                            {mortAmortPreview.monthsSaved === 1 ? 'mes' : 'meses'} de hipoteca
                          </span>
                        )}
                        {mortAmortPreview.annualInterestSaved > 0 && (
                          <span>
                            Ahorro intereses:{' '}
                            <strong>~{formatCurrency(mortAmortPreview.annualInterestSaved)} / año</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Valores calculados según sistema francés (TIN {meta.interestRate || 0}%). Puedes ajustarlos con el recibo exacto del banco:
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Nuevo recibo (€)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={mortSimNewReceipt}
                        onChange={(e) => setMortSimNewReceipt(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Cuotas restantes</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={mortSimNewRemaining}
                        onChange={(e) => setMortSimNewRemaining(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Principal recibo (€)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={mortSimNewPrincipalPart}
                        onChange={(e) => setMortSimNewPrincipalPart(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Intereses recibo (€)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={mortSimNewInterestPart}
                        onChange={(e) => setMortSimNewInterestPart(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cuenta de cargo</Label>
                      <Select value={amortAccountId} onValueChange={setAmortAccountId}>
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fecha operación</Label>
                      <Input
                        type="date"
                        value={amortDate}
                        onChange={(e) => setAmortDate(e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recordBankTx}
                      onChange={(e) => setRecordBankTx(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span>Registrar este pago en el historial de movimientos de la cuenta</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAmortizing(false)}
                      disabled={isSubmittingAmort}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmAmortization}
                      disabled={isSubmittingAmort}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSubmittingAmort ? 'Aplicando...' : 'Confirmar amortización'}</span>
                    </Button>
                  </div>
                </div>
              ) : !loan.isCompleted && isEditingLoan ? (
                <div className="space-y-4 bg-background/80 p-4 rounded-2xl border border-border/60">
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
                      Al guardar se actualizan los próximos recibos mensuales en Inicio automáticamente.
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background/60 p-4 rounded-2xl border border-border/50">
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
                  <div className="rounded-2xl bg-background/60 border border-border/50 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Desglose del recibo actual: {formatCurrency(loan.installmentAmount)}
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

              {/* Receipts list */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold">
                    Recibos programados desde {format(parseISO(meta.baselineDate), 'dd MMM yyyy', { locale: es })}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {loan.linkedRule
                      ? 'Se actualizan desde la regla vinculada'
                      : `Generados automáticamente (${meta.category || 'Vivienda'})`}
                  </span>
                </div>
                {expenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No hay recibos futuros o confirmados todavía desde la fecha base.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {expenses.slice(0, 14).map((tx: any, idx: number) => {
                      const isAmort = isExtraAmortizationTx(tx);
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between text-xs sm:text-sm py-1.5 px-2.5 rounded-lg bg-background/70 border border-border/40"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-muted-foreground text-xs w-6">
                              {isAmort ? '★' : `#${idx + 1}`}
                            </span>
                            <span className="font-medium">
                              {format(parseISO(tx.date), "dd MMM yyyy", { locale: es })}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isAmort
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                  : tx.isPending
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              }`}
                            >
                              {isAmort
                                ? 'Amortización'
                                : tx.isPending
                                ? 'Pendiente'
                                : 'Confirmada'}
                            </span>
                          </div>
                          <span className={tx.isPending ? "text-expense font-semibold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Regular Loan / Fractionation Expanded Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-background/80 border border-border/50">
                    Capital / Total: <strong className="text-foreground">{formatCurrency(loan.totalReal)}</strong>
                  </span>
                  {loan.setupFee > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-background/80 border border-border/50">
                      Comisión: <strong className="text-foreground">{formatCurrency(loan.setupFee)}</strong>
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-xl bg-background/80 border border-border/50 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Inicio: <strong className="text-foreground">{loan.startDate ? format(parseISO(loan.startDate), "MMM yyyy", { locale: es }) : 'N/A'}</strong>
                  </span>
                </div>
                {loan.isCompleted ? (
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 self-end sm:self-auto">
                    Pagado · Solo informativo
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    <Button
                      variant={isAmortizing ? "default" : "outline"}
                      size="sm"
                      className={`h-8 gap-1.5 text-xs font-semibold rounded-xl ${
                        isAmortizing
                          ? ''
                          : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                      onClick={toggleAmortizer}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>{isAmortizing ? 'Cerrar amortización' : 'Amortizar'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-semibold rounded-xl"
                      onClick={openEditor}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEditingLoan ? 'Cerrar edición' : 'Editar'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-xl"
                      onClick={onDelete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {!loan.isCompleted && isAmortizing && (
                <div className="space-y-4 bg-background/90 p-4 rounded-2xl border border-emerald-500/30">
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Amortizar {loan.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tus {loan.paidInstallments} cuotas ya pagadas NO se modifican, así tu saldo bancario sigue cuadrado al céntimo.
                    </p>
                  </div>

                  {/* Mode selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setAmortMode('full');
                        setAmortAmount((loan.pendingPrincipal || 0).toFixed(2));
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        amortMode === 'full'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Liquidación total
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAmortMode('partial_term');
                        const oneQuota = Math.min(
                          loan.pendingPrincipal || 0,
                          loan.installmentAmount || 0
                        );
                        setAmortAmount(oneQuota.toFixed(2));
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        amortMode === 'partial_term'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Parcial · Quitar cuotas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAmortMode('partial_installment');
                        const half = Math.max(
                          0,
                          Math.round(((loan.pendingPrincipal || 0) / 2) * 100) / 100
                        );
                        setAmortAmount(half.toFixed(2));
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        amortMode === 'partial_installment'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Parcial · Bajar cuota
                    </button>
                  </div>

                  {/* Amount & Quick suggestions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">
                        {amortMode === 'full'
                          ? 'Importe real de liquidación (€)'
                          : 'Importe a amortizar hoy (€)'}
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={amortAmount}
                        onChange={(e) => setAmortAmount(e.target.value)}
                        className="h-9 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Cuenta bancaria de cargo</Label>
                      <Select value={amortAccountId} onValueChange={setAmortAccountId}>
                        <SelectTrigger className="h-9 text-sm bg-background">
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Fecha del pago</Label>
                      <Input
                        type="date"
                        value={amortDate}
                        onChange={(e) => setAmortDate(e.target.value)}
                        className="h-9 text-sm bg-background"
                      />
                    </div>
                  </div>

                  {/* Contextual quick presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {amortMode === 'full' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAmortAmount((loan.pendingPrincipal || 0).toFixed(2))}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                        >
                          Total cuotas: {formatCurrency(loan.pendingPrincipal)}
                        </button>
                        {loan.pendingImplicitInterest > 0.5 && regularAmortPreview && (
                          <button
                            type="button"
                            onClick={() =>
                              setAmortAmount(
                                regularAmortPreview.estimatedWithoutInterest.toFixed(2)
                              )
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                          >
                            Est. sin intereses futuros:{' '}
                            {formatCurrency(regularAmortPreview.estimatedWithoutInterest)}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {loan.installmentAmount > 0 && loan.installmentAmount < loan.pendingPrincipal && (
                          <button
                            type="button"
                            onClick={() => setAmortAmount(loan.installmentAmount.toFixed(2))}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                          >
                            1 cuota ({formatCurrency(loan.installmentAmount)})
                          </button>
                        )}
                        {loan.installmentAmount * 2 < loan.pendingPrincipal && (
                          <button
                            type="button"
                            onClick={() => setAmortAmount((loan.installmentAmount * 2).toFixed(2))}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                          >
                            2 cuotas ({formatCurrency(loan.installmentAmount * 2)})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setAmortAmount(((loan.pendingPrincipal || 0) / 2).toFixed(2))
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                        >
                          Mitad ({formatCurrency((loan.pendingPrincipal || 0) / 2)})
                        </button>
                      </>
                    )}
                  </div>

                  {/* Impact Preview Box */}
                  {regularAmortPreview && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs space-y-1">
                      {amortMode === 'full' ? (
                        <>
                          <p className="font-bold text-emerald-800 dark:text-emerald-300">
                            Liberas +{formatCurrency(loan.installmentAmount)} / mes de inmediato · Se eliminan las {loan.remainingInstallments} cuotas futuras pendientes.
                          </p>
                          {regularAmortPreview.fullSavings > 0 && (
                            <p className="text-muted-foreground">
                              Ahorro estimado frente a pagar las cuotas hasta el final:{' '}
                              <strong className="text-foreground">
                                {formatCurrency(regularAmortPreview.fullSavings)}
                              </strong>
                            </p>
                          )}
                        </>
                      ) : amortMode === 'partial_term' ? (
                        <p className="font-bold text-foreground">
                          Se eliminan{' '}
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {regularAmortPreview.removedCount}{' '}
                            {regularAmortPreview.removedCount === 1
                              ? 'cuota final'
                              : 'cuotas finales'}
                          </span>{' '}
                          · Quedarían {regularAmortPreview.termRemainingCount} cuotas pendientes (
                          {formatCurrency(regularAmortPreview.newTotal)} restantes).
                        </p>
                      ) : (
                        <p className="font-bold text-foreground">
                          Tu nueva cuota bajará a{' '}
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(regularAmortPreview.newQuota)} / mes
                          </span>{' '}
                          (liberas +{formatCurrency(regularAmortPreview.monthlyRelief)} / mes en las{' '}
                          {regularAmortPreview.pendingCount} cuotas restantes).
                        </p>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recordBankTx}
                      onChange={(e) => setRecordBankTx(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span>Registrar este pago en el historial de movimientos de la cuenta</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAmortizing(false)}
                      disabled={isSubmittingAmort}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmAmortization}
                      disabled={isSubmittingAmort}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {isSubmittingAmort
                          ? 'Aplicando...'
                          : amortMode === 'full'
                          ? 'Liquidar préstamo'
                          : 'Confirmar amortización'}
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              {!loan.isCompleted && isEditingLoan && (
                <div className="space-y-3 bg-background/80 p-3.5 rounded-2xl border border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Fecha de Inicio</label>
                      <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Pagado hasta hoy (informativo)</label>
                      <div className="h-9 px-3 rounded-md border border-border/50 bg-muted/40 flex items-center text-sm font-semibold text-foreground">
                        {formatCurrency(loan.amountPaid)}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditingLoan(false)}>Cancelar</Button>
                    <Button size="sm" className="h-8 text-xs" onClick={handleSaveLoan}>Guardar</Button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Detalle de cuotas y movimientos</h4>
                <div className="space-y-1.5">
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
            </>
          )}
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

  const isFee = String(tx.description || '').includes('Comisión apertura');
  const isAmort = isExtraAmortizationTx(tx);
  const canEdit = Boolean(tx.isPending);

  if (canEdit && isEditing) {
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
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-muted-foreground text-xs w-5">
          {isFee || isAmort ? '-' : index}
        </span>
        <span className="font-medium">{format(parseISO(tx.date), "dd MMM yyyy", { locale: es })}</span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isAmort
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              : tx.isPending
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          }`}
        >
          {isAmort ? 'Amortización' : tx.isPending ? 'Pendiente' : 'Pagada'}
        </span>
        {isFee && <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Comisión</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={tx.isPending ? "text-red-500 font-medium" : "text-emerald-500 font-semibold"}>
          {formatCurrency(tx.amount)}
        </span>
        {canEdit && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground transition-opacity" 
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
