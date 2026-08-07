import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBudgets, getSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from "@/api/local/planning";

export const usePlanning = () => {
  const queryClient = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: ["budgets"],
    queryFn: getBudgets,
  });

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: getSavingsGoals,
  });

  const addGoalMutation = useMutation({
    mutationFn: addSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: updateSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: deleteSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    budgets: budgetsQuery.data || [],
    isBudgetsLoading: budgetsQuery.isLoading,
    goals: goalsQuery.data || [],
    isGoalsLoading: goalsQuery.isLoading,
    addGoal: addGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
  };
};
