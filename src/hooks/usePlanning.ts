import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBudgets, saveBudgetsForMonth, getSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from "@/api/local/planning";
import { Budget, SavingsGoal } from "@/types/finance";

const EMPTY_BUDGETS: Budget[] = [];
const EMPTY_GOALS: SavingsGoal[] = [];

export const usePlanning = () => {
  const queryClient = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: ["budgets"],
    queryFn: getBudgets,
  });

  const saveBudgetsMutation = useMutation({
    mutationFn: (args: { month: string, budgets: any[] }) => saveBudgetsForMonth(args.month, args.budgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
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
    budgets: budgetsQuery.data ?? EMPTY_BUDGETS,
    isBudgetsLoading: budgetsQuery.isLoading,
    goals: goalsQuery.data ?? EMPTY_GOALS,
    isGoalsLoading: goalsQuery.isLoading,
    saveBudgets: saveBudgetsMutation.mutateAsync,
    addGoal: addGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
  };
};
