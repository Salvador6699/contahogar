import { Loan, Transaction } from "@/types/finance";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const getLoans = async (): Promise<Loan[]> => {
  const { data, error } = await supabase.from('loans').select('*');
  if (error) throw new Error(error.message);
  return data as Loan[];
};

export const addLoan = async (loan: Omit<Loan, "id">): Promise<Loan> => {
  const newLoan = {
    id: uuidv4(),
    ...loan
  };
  const { data, error } = await supabase.from('loans').insert([newLoan]).select().single();
  if (error) throw new Error(error.message);
  return data as Loan;
};

export const updateLoan = async (loan: Loan): Promise<void> => {
  const { error } = await supabase.from('loans').update(loan).eq('id', loan.id);
  if (error) throw new Error(error.message);
};

export const deleteLoan = async (id: string): Promise<void> => {
  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// Apply fractionated transaction
export const applyFractionatedTransaction = async (
  transaction: Omit<Transaction, "id">,
  fractionationData: { isFractionated: boolean; installments: number; installmentAmount: number; firstInstallmentDate: string; setupFee: number; setupFeeDate: string; },
  editingId?: string
): Promise<void> => {
  const loanId = uuidv4();
  
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

  const newLoan: Loan = {
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
      id: uuidv4(),
      amount: setupFee,
      category: "Gastos Financieros",
      date: fractionationData.setupFeeDate,
      isPending: isSetupFeeFuture,
      description: transaction.description ? `Comisión apertura: ${transaction.description}` : `Comisión apertura fraccionamiento`,
      linkedLoanId: loanId
    });
  }

  for (let i = 0; i < installments; i++) {
    const dt = new Date(firstInstallmentDate);
    dt.setMonth(dt.getMonth() + i);
    const dateStr = dt.toISOString().split("T")[0];
    
    const isPending = i > 0 || transaction.isPending;

    transactionsToInsert.push({
      ...transaction,
      id: uuidv4(),
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
  loanData: { name: string; amount: number; date: string; accountId: string; installments: number; installmentAmount: number; firstInstallmentDate: string; setupFee: number; setupFeeDate: string; description?: string; isStarted?: boolean; startingPaidAmount?: number },
): Promise<void> => {
  const loanId = uuidv4();
  
  const { name, amount, installments, installmentAmount, firstInstallmentDate, setupFee, setupFeeDate, accountId, date, description, isStarted, startingPaidAmount } = loanData;

  const newLoan: Loan = {
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
    startingPaidAmount: startingPaidAmount || 0
  };

  const { error: loanError } = await supabase.from('loans').insert([newLoan]);
  if (loanError) throw new Error(loanError.message);

  const transactionsToInsert = [];

  if (!isStarted) {
    transactionsToInsert.push({
      id: uuidv4(),
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
      id: uuidv4(),
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
    const dt = new Date(firstInstallmentDate);
    dt.setMonth(dt.getMonth() + i);
    const dateStr = dt.toISOString().split("T")[0];
    
    transactionsToInsert.push({
      id: uuidv4(),
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
