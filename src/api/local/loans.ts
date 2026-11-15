import { Loan, MortgageMetadata, Transaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { addDays, addMonths, parseISO, format } from "date-fns";


export const getLoans = async (): Promise<Loan[]> => {
  const { data, error } = await supabase.from('loans').select('*');
  if (error) throw new Error(error.message);
  return data as Loan[];
};

export const addLoan = async (loan: Omit<Loan, "id">): Promise<Loan> => {
  const newLoan = {
    id: crypto.randomUUID(),
    ...loan
  };
  const { data, error } = await supabase.from('loans').insert([newLoan]).select().single();
  if (error) throw new Error(error.message);
  return data as Loan;
};

export const updateLoan = async (loan: Loan): Promise<void> => {
  const { data: oldLoan } = await supabase
    .from('loans')
    .select('startDate')
    .eq('id', loan.id)
    .maybeSingle();

  const { error } = await supabase.from('loans').update(loan).eq('id', loan.id);
  if (error) throw new Error(error.message);

  if (loan.startDate && oldLoan && loan.startDate !== oldLoan.startDate) {
    const { data: linkedTxs, error: txFetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('linkedLoanId', loan.id)
      .eq('type', 'expense');

    if (!txFetchError && linkedTxs) {
      const installments = linkedTxs
        .filter((t) => !t.description?.includes('Comisión apertura'))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const baseStartDate = parseISO(loan.startDate);
      await Promise.all(
        installments.map((inst, index) => {
          const newDateStr = format(addMonths(baseStartDate, index), 'yyyy-MM-dd');
          return supabase
            .from('transactions')
            .update({ date: newDateStr })
            .eq('id', inst.id);
        })
      );
    }
  }
};

export const deleteLoan = async (id: string): Promise<void> => {
  const { data: loanToDelete } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (
    loanToDelete &&
    loanToDelete.type === 'fractionation' &&
    loanToDelete.originalTransactionData
  ) {
    const origId = loanToDelete.originalTransactionData.id;
    // No restauramos transacciones recurrentes (rec_); al borrar el placeholder de 0€,
    // el motor syncRecurringTransactionsToSupabase la regenerará limpia si procede.
    if (!origId || !origId.startsWith('rec_')) {
      const restoredTx = {
        ...loanToDelete.originalTransactionData,
        id: origId || crypto.randomUUID(),
      };
      await supabase.from('transactions').upsert([restoredTx]);
    }
  }

  // Eliminar todas las cuotas y transacciones vinculadas al préstamo/fraccionamiento
  const { error: txDeleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('linkedLoanId', id);
  if (txDeleteError) throw new Error(txDeleteError.message);

  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// Apply fractionated transaction
export const applyFractionatedTransaction = async (
  transaction: Omit<Transaction, "id">,
  fractionationData: { isFractionated: boolean; installments: number; installmentAmount: number; firstInstallmentDate: string; setupFee: number; setupFeeDate: string; },
  editingId?: string
): Promise<void> => {
  const loanId = crypto.randomUUID();
  
  if (editingId) {
    if (editingId.startsWith('rec_')) {
      const { error: txError } = await supabase.from('transactions').update({
        isPending: false,
        isIgnored: true,
        amount: 0,
        linkedLoanId: loanId,
        // Since we don't have the current description easily available here without fetching, 
        // we assume it is passed or we just fetch it first.
      }).eq('id', editingId);
      if (txError) throw new Error(txError.message);
    } else {
      const { error: delError } = await supabase.from('transactions').delete().eq('id', editingId);
      if (delError) throw new Error(delError.message);
    }
  }

  const { installments, installmentAmount, firstInstallmentDate, setupFee } = fractionationData;
  const originalTotal = transaction.amount;

  const newLoan: any = {
    id: loanId,
    name: transaction.description || "Fraccionamiento",
    type: "fractionation",
    amount: originalTotal,
    installments,
    installmentAmount,
    setupFee,
    startDate: firstInstallmentDate,
    accountId: transaction.accountId,
    status: "active",
    originalTransactionData: { ...transaction, id: editingId || '' }
  };

  const { error: loanError } = await supabase.from('loans').insert([newLoan]);
  if (loanError) throw new Error(loanError.message);

  const transactionsToInsert = [];

  if (setupFee > 0) {
    const isSetupFeeFuture = new Date(fractionationData.setupFeeDate) > new Date();
    transactionsToInsert.push({
      ...transaction,
      id: crypto.randomUUID(),
      amount: setupFee,
      category: "Gastos Financieros",
      date: fractionationData.setupFeeDate,
      isPending: isSetupFeeFuture,
      description: transaction.description ? `Comisión apertura: ${transaction.description}` : `Comisión apertura fraccionamiento`,
      linkedLoanId: loanId
    });
  }

  for (let i = 0; i < installments; i++) {
    const dt = addMonths(parseISO(firstInstallmentDate), i);
    const dateStr = format(dt, "yyyy-MM-dd");
    
    const isPending = i > 0 || !!transaction.isPending;

    transactionsToInsert.push({
      ...transaction,
      id: crypto.randomUUID(),
      amount: installmentAmount,
      date: dateStr,
      isPending: isPending || false,
      description: transaction.description ? `${transaction.description} (Cuota ${i+1}/${installments})` : `Cuota ${i+1}/${installments}`,
      linkedLoanId: loanId
    });
  }
  
  if (transactionsToInsert.length > 0) {
    const { error: txsError } = await supabase.from('transactions').insert(transactionsToInsert);
    if (txsError) throw new Error(txsError.message);
  }
};

export const applyLoanTransaction = async (
  loanData: {
    name: string;
    amount: number;
    date: string;
    accountId: string;
    installments: number;
    installmentAmount: number;
    firstInstallmentDate: string;
    setupFee: number;
    setupFeeDate: string;
    description?: string;
    isStarted?: boolean;
    startingPaidAmount?: number;
    originalTransactionData?: MortgageMetadata | any;
  },
): Promise<void> => {
  const loanId = crypto.randomUUID();
  
  const {
    name,
    amount,
    installments,
    installmentAmount,
    firstInstallmentDate,
    setupFee,
    setupFeeDate,
    accountId,
    date,
    description,
    isStarted,
    startingPaidAmount,
    originalTransactionData,
  } = loanData;

  const newLoan: any = {
    id: loanId,
    name,
    type: "loan",
    amount,
    installments,
    installmentAmount,
    setupFee,
    startDate: firstInstallmentDate,
    accountId,
    status: "active",
    isStarted,
    startingPaidAmount: startingPaidAmount || 0,
    originalTransactionData: originalTransactionData || null,
  };

  const { error: loanError } = await supabase.from('loans').insert([newLoan]);
  if (loanError) throw new Error(loanError.message);

  if (originalTransactionData?.isMortgage) {
    return;
  }

  const transactionsToInsert = [];

  if (!isStarted) {
    transactionsToInsert.push({
      id: crypto.randomUUID(),
      date,
      amount,
      category: "Ingresos",
      type: "income",
      accountId,
      description: description || `Ingreso de Préstamo: ${name}`,
      isPending: false,
      linkedLoanId: loanId
    });
  }

  if (setupFee > 0) {
    const isSetupFeeFuture = new Date(setupFeeDate) > new Date();
    transactionsToInsert.push({
      id: crypto.randomUUID(),
      date: setupFeeDate,
      amount: setupFee,
      category: "Gastos Financieros",
      type: "expense",
      accountId,
      description: `Comisión apertura: ${name}`,
      isPending: isSetupFeeFuture,
      linkedLoanId: loanId
    });
  }

  for (let i = 0; i < installments; i++) {
    const dt = addMonths(parseISO(firstInstallmentDate), i);
    const dateStr = format(dt, "yyyy-MM-dd");
    
    transactionsToInsert.push({
      id: crypto.randomUUID(),
      amount: installmentAmount,
      date: dateStr,
      category: "Devolución Préstamo",
      type: "expense",
      accountId,
      isPending: true,
      description: `Cuota ${i+1}/${installments}: ${name}`,
      linkedLoanId: loanId
    });
  }
  
  if (transactionsToInsert.length > 0) {
    const { error: txsError } = await supabase.from('transactions').insert(transactionsToInsert);
    if (txsError) throw new Error(txsError.message);
  }
};

export interface AmortizeLoanParams {
  loanId: string;
  mode: 'full' | 'partial_term' | 'partial_installment' | 'mortgage';
  amount: number;
  date: string;
  accountId: string;
  recordTransaction?: boolean;
  mortgageUpdates?: {
    newReceipt: number;
    newPrincipalPortion: number;
    newInterestPortion: number;
    newPendingPrincipal: number;
    newRemainingInstallments: number;
  };
}

export const amortizeLoan = async (params: AmortizeLoanParams): Promise<void> => {
  const {
    loanId,
    mode,
    amount,
    date,
    accountId,
    recordTransaction = true,
    mortgageUpdates,
  } = params;

  const { data: loan, error: loanFetchError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();
  if (loanFetchError || !loan) {
    throw new Error(loanFetchError?.message || 'Préstamo no encontrado');
  }

  if (mode === 'mortgage' && mortgageUpdates) {
    const meta = (loan.originalTransactionData || {}) as MortgageMetadata;
    const {
      newReceipt,
      newPrincipalPortion,
      newInterestPortion,
      newPendingPrincipal,
      newRemainingInstallments,
    } = mortgageUpdates;

    const amortizedBaseline = Number(
      Math.max(0, loan.amount - newPendingPrincipal).toFixed(2)
    );
    const paidBaseline = Math.max(0, loan.installments - newRemainingInstallments);

    // Advance baselineDate past ordinary confirmed monthly receipts so they aren't double-counted
    const { data: allExpenseTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'expense')
      .gte('date', meta.baselineDate || loan.startDate || date);

    const confirmedMonthly = (allExpenseTxs || [])
      .filter((t: any) => {
        if (t.isPending || t.isIgnored) return false;
        const desc = `${t.description || ''}`.toLowerCase();
        if (
          String(t.id || '').startsWith('amort_') ||
          desc.includes('amortización anticipada') ||
          desc.includes('amortización parcial')
        ) {
          return false;
        }
        return (
          t.linkedLoanId === loan.id ||
          String(t.id || '').startsWith(`rec_loan_${loan.id}_`) ||
          (meta.linkedRuleId && String(t.id || '').startsWith(`rec_${meta.linkedRuleId}_`))
        );
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let nextBaselineDate = meta.baselineDate || date;
    if (confirmedMonthly.length > 0) {
      const lastDate = confirmedMonthly[confirmedMonthly.length - 1].date;
      nextBaselineDate = format(addDays(parseISO(lastDate), 1), 'yyyy-MM-dd');
    }

    if (recordTransaction && amount > 0) {
      const { error: txErr } = await supabase.from('transactions').insert([
        {
          id: `amort_${crypto.randomUUID()}`,
          date,
          amount: Number(amount.toFixed(2)),
          category: meta.category || 'Vivienda',
          type: 'expense',
          accountId,
          isPending: false,
          description: `Amortización anticipada: ${loan.name}`,
          linkedLoanId: loan.id,
        },
      ]);
      if (txErr) throw new Error(txErr.message);
    }

    if (newPendingPrincipal <= 0) {
      await supabase
        .from('transactions')
        .delete()
        .eq('linkedLoanId', loan.id)
        .eq('isPending', true);
    }

    const updatedMeta: MortgageMetadata = {
      ...meta,
      pendingPrincipalBaseline: Number(newPendingPrincipal.toFixed(2)),
      amortizedPrincipalBaseline: amortizedBaseline,
      paidInstallmentsBaseline: paidBaseline,
      baselineDate: nextBaselineDate,
      currentPrincipalPortion: Number(newPrincipalPortion.toFixed(2)),
      currentInterestPortion: Number(newInterestPortion.toFixed(2)),
    };

    const { error: updErr } = await supabase
      .from('loans')
      .update({
        installmentAmount: Number(newReceipt.toFixed(2)),
        startingPaidAmount: amortizedBaseline,
        status: newPendingPrincipal <= 0 ? 'completed' : 'active',
        originalTransactionData: updatedMeta,
      })
      .eq('id', loan.id);
    if (updErr) throw new Error(updErr.message);
    return;
  }

  // Regular loan or fractionation
  const { data: linkedTxs, error: txFetchErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('linkedLoanId', loanId)
    .eq('type', 'expense');
  if (txFetchErr) throw new Error(txFetchErr.message);

  const expenses = linkedTxs || [];
  const pendingTxs = expenses
    .filter((t: any) => t.isPending)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const defaultCategory =
    expenses.find((t: any) => !t.description?.includes('Comisión apertura') && t.category)?.category ||
    (loan.type === 'loan' ? 'Devolución Préstamo' : 'Gastos Financieros');

  if (mode === 'full') {
    const pendingIds = pendingTxs.map((t: any) => t.id);
    if (pendingIds.length > 0) {
      const { error: delErr } = await supabase
        .from('transactions')
        .delete()
        .in('id', pendingIds);
      if (delErr) throw new Error(delErr.message);
    }

    if (recordTransaction && amount > 0) {
      const { error: insErr } = await supabase.from('transactions').insert([
        {
          id: `amort_${crypto.randomUUID()}`,
          date,
          amount: Number(amount.toFixed(2)),
          category: defaultCategory,
          type: 'expense',
          accountId,
          isPending: false,
          description: `Amortización anticipada total: ${loan.name}`,
          linkedLoanId: loanId,
        },
      ]);
      if (insErr) throw new Error(insErr.message);
    }

    const { error: updErr } = await supabase
      .from('loans')
      .update({ status: 'completed' })
      .eq('id', loanId);
    if (updErr) throw new Error(updErr.message);
    return;
  }

  const pendingInstallments = pendingTxs.filter(
    (t: any) => !String(t.description || '').includes('Comisión apertura')
  );

  if (mode === 'partial_term') {
    if (recordTransaction && amount > 0) {
      const { error: insErr } = await supabase.from('transactions').insert([
        {
          id: `amort_${crypto.randomUUID()}`,
          date,
          amount: Number(amount.toFixed(2)),
          category: defaultCategory,
          type: 'expense',
          accountId,
          isPending: false,
          description: `Amortización parcial (plazo): ${loan.name}`,
          linkedLoanId: loanId,
        },
      ]);
      if (insErr) throw new Error(insErr.message);
    }

    let remainingToDiscount = Number(amount.toFixed(2));
    const idsToDelete: string[] = [];

    for (let i = pendingInstallments.length - 1; i >= 0 && remainingToDiscount > 0.005; i--) {
      const inst = pendingInstallments[i];
      if (inst.amount <= remainingToDiscount + 0.005) {
        idsToDelete.push(inst.id);
        remainingToDiscount = Number((remainingToDiscount - inst.amount).toFixed(2));
      } else {
        const nextAmount = Number((inst.amount - remainingToDiscount).toFixed(2));
        const { error: updInstErr } = await supabase
          .from('transactions')
          .update({ amount: nextAmount })
          .eq('id', inst.id);
        if (updInstErr) throw new Error(updInstErr.message);
        remainingToDiscount = 0;
      }
    }

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('transactions')
        .delete()
        .in('id', idsToDelete);
      if (delErr) throw new Error(delErr.message);
    }

    if (idsToDelete.length >= pendingInstallments.length) {
      const { error: updErr } = await supabase
        .from('loans')
        .update({ status: 'completed' })
        .eq('id', loanId);
      if (updErr) throw new Error(updErr.message);
    }
    return;
  }

  if (mode === 'partial_installment') {
    if (recordTransaction && amount > 0) {
      const { error: insErr } = await supabase.from('transactions').insert([
        {
          id: `amort_${crypto.randomUUID()}`,
          date,
          amount: Number(amount.toFixed(2)),
          category: defaultCategory,
          type: 'expense',
          accountId,
          isPending: false,
          description: `Amortización parcial (cuota): ${loan.name}`,
          linkedLoanId: loanId,
        },
      ]);
      if (insErr) throw new Error(insErr.message);
    }

    const currentPendingTotal = pendingInstallments.reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0),
      0
    );
    const newPendingTotal = Math.max(0, Number((currentPendingTotal - amount).toFixed(2)));

    if (newPendingTotal <= 0) {
      const pendingIds = pendingTxs.map((t: any) => t.id);
      if (pendingIds.length > 0) {
        const { error: delErr } = await supabase
          .from('transactions')
          .delete()
          .in('id', pendingIds);
        if (delErr) throw new Error(delErr.message);
      }
      const { error: updErr } = await supabase
        .from('loans')
        .update({ status: 'completed' })
        .eq('id', loanId);
      if (updErr) throw new Error(updErr.message);
      return;
    }

    if (pendingInstallments.length > 0) {
      const count = pendingInstallments.length;
      const baseInst = Number((newPendingTotal / count).toFixed(2));
      const remainder = Number((newPendingTotal - baseInst * count).toFixed(2));

      await Promise.all(
        pendingInstallments.map((inst: any, idx: number) => {
          const nextAmount =
            idx === count - 1 ? Number((baseInst + remainder).toFixed(2)) : baseInst;
          return supabase
            .from('transactions')
            .update({ amount: nextAmount })
            .eq('id', inst.id);
        })
      );

      const { error: updErr } = await supabase
        .from('loans')
        .update({ installmentAmount: baseInst })
        .eq('id', loanId);
      if (updErr) throw new Error(updErr.message);
    }
  }
};
