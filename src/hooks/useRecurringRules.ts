import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule } from '@/api/local/recurringRules';
import { RecurringExpenseRule } from '@/types/finance';
import { syncRecurringTransactionsToSupabase } from '@/lib/recurrence';

export const useRecurringRules = () => {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ['recurringRules'],
    queryFn: getRecurringRules,
  });

  const addRuleMutation = useMutation({
    mutationFn: addRecurringRule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurringRules'] });
      await syncRecurringTransactionsToSupabase();
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: updateRecurringRule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurringRules'] });
      await syncRecurringTransactionsToSupabase();
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteRecurringRule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurringRules'] });
      await syncRecurringTransactionsToSupabase();
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return {
    rules: rulesQuery.data || [],
    isLoading: rulesQuery.isLoading,
    isError: rulesQuery.isError,
    addRule: addRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutateAsync,
  };
};
