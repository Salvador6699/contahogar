import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLoans, addLoan, updateLoan, deleteLoan, applyFractionatedTransaction, applyLoanTransaction } from '@/api/local/loans';
import { Loan } from '@/types/finance';

export const useLoans = () => {
  const queryClient = useQueryClient();

  const loansQuery = useQuery({
    queryKey: ['loans'],
    queryFn: getLoans,
  });

  const addLoanMutation = useMutation({
    mutationFn: addLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  const updateLoanMutation = useMutation({
    mutationFn: updateLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  const deleteLoanMutation = useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const applyFractionatedTransactionMutation = useMutation({
    mutationFn: (args: { transaction: any, fractionationData: any, editingId?: string }) => 
      applyFractionatedTransaction(args.transaction, args.fractionationData, args.editingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const applyLoanTransactionMutation = useMutation({
    mutationFn: applyLoanTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return {
    loans: loansQuery.data || [],
    isLoading: loansQuery.isLoading,
    isError: loansQuery.isError,
    addLoan: addLoanMutation.mutateAsync,
    updateLoan: updateLoanMutation.mutateAsync,
    deleteLoan: deleteLoanMutation.mutateAsync,
    applyFractionatedTransaction: applyFractionatedTransactionMutation.mutateAsync,
    applyLoanTransaction: applyLoanTransactionMutation.mutateAsync,
  };
};
