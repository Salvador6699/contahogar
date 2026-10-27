import { useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBudgets,
  saveBudgetsForMonth,
  savePlanningSetting,
  SETTING_SAVINGS_TIMEFRAME_ID,
  SETTING_EXCLUDED_NEXT_MONTH_ID,
  getSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "@/api/local/planning";
import { Budget, SavingsGoal } from "@/types/finance";

const EMPTY_BUDGETS: Budget[] = [];
const EMPTY_GOALS: SavingsGoal[] = [];

export const usePlanning = () => {
  const queryClient = useQueryClient();
  const hasMigratedSettingsRef = useRef(false);

  const budgetsQuery = useQuery({
    queryKey: ["budgets"],
    queryFn: getBudgets,
  });

  const rawBudgets = budgetsQuery.data ?? EMPTY_BUDGETS;

  const budgets = useMemo(
    () =>
      rawBudgets.filter(
        (b) => !b.id?.startsWith("__setting_") && !b.month?.startsWith("__setting_")
      ),
    [rawBudgets]
  );

  const savingsTimeframe = useMemo(() => {
    const cloudRow = rawBudgets.find((b) => b.id === SETTING_SAVINGS_TIMEFRAME_ID);
    if (cloudRow?.category) {
      return cloudRow.category;
    }
    return localStorage.getItem("savingsTimeframe") || "13";
  }, [rawBudgets]);

  const excludedNextMonthIds = useMemo<string[]>(() => {
    const cloudRow = rawBudgets.find((b) => b.id === SETTING_EXCLUDED_NEXT_MONTH_ID);
    if (cloudRow?.category) {
      try {
        const parsed = JSON.parse(cloudRow.category);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback below
      }
    }
    try {
      const localRaw = localStorage.getItem("excludedNextMonthProvisionIds");
      return localRaw ? JSON.parse(localRaw) : [];
    } catch {
      return [];
    }
  }, [rawBudgets]);

  // Mantener localStorage sincronizado con la nube y migrar ajustes locales si aún no existen en Supabase
  useEffect(() => {
    if (budgetsQuery.isLoading || !budgetsQuery.isSuccess) return;

    const cloudTimeframeRow = rawBudgets.find((b) => b.id === SETTING_SAVINGS_TIMEFRAME_ID);
    const cloudExcludedRow = rawBudgets.find((b) => b.id === SETTING_EXCLUDED_NEXT_MONTH_ID);

    if (cloudTimeframeRow?.category) {
      localStorage.setItem("savingsTimeframe", cloudTimeframeRow.category);
    }
    if (cloudExcludedRow?.category) {
      localStorage.setItem("excludedNextMonthProvisionIds", cloudExcludedRow.category);
    }

    if (!hasMigratedSettingsRef.current) {
      hasMigratedSettingsRef.current = true;
      const localTf = localStorage.getItem("savingsTimeframe");
      if (!cloudTimeframeRow && localTf) {
        savePlanningSetting(SETTING_SAVINGS_TIMEFRAME_ID, localTf).then(() => {
          queryClient.invalidateQueries({ queryKey: ["budgets"] });
        }).catch(console.error);
      }

      const localEx = localStorage.getItem("excludedNextMonthProvisionIds");
      if (!cloudExcludedRow && localEx && localEx !== "[]") {
        savePlanningSetting(SETTING_EXCLUDED_NEXT_MONTH_ID, localEx).then(() => {
          queryClient.invalidateQueries({ queryKey: ["budgets"] });
        }).catch(console.error);
      }
    }
  }, [rawBudgets, budgetsQuery.isLoading, budgetsQuery.isSuccess, queryClient]);

  const saveBudgetsMutation = useMutation({
    mutationFn: (args: { month: string; budgets: any[] }) =>
      saveBudgetsForMonth(args.month, args.budgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: (args: { settingId: string; value: string }) =>
      savePlanningSetting(args.settingId, args.value),
    onMutate: async ({ settingId, value }) => {
      await queryClient.cancelQueries({ queryKey: ["budgets"] });
      const previous = queryClient.getQueryData<Budget[]>(["budgets"]) ?? [];
      const exists = previous.some((b) => b.id === settingId);
      const next = exists
        ? previous.map((b) => (b.id === settingId ? { ...b, category: value } : b))
        : [
            ...previous,
            {
              id: settingId,
              month: settingId,
              category: value,
              amount: 0,
              isAuto: false,
            },
          ];
      queryClient.setQueryData(["budgets"], next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["budgets"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const updateSavingsTimeframe = async (val: string) => {
    localStorage.setItem("savingsTimeframe", val);
    window.dispatchEvent(new Event("storage"));
    await updateSettingMutation.mutateAsync({
      settingId: SETTING_SAVINGS_TIMEFRAME_ID,
      value: val,
    });
  };

  const updateExcludedNextMonthIds = async (ids: string[]) => {
    const serialized = JSON.stringify(ids);
    localStorage.setItem("excludedNextMonthProvisionIds", serialized);
    window.dispatchEvent(new Event("storage"));
    await updateSettingMutation.mutateAsync({
      settingId: SETTING_EXCLUDED_NEXT_MONTH_ID,
      value: serialized,
    });
  };

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
    budgets,
    isBudgetsLoading: budgetsQuery.isLoading,
    goals: goalsQuery.data ?? EMPTY_GOALS,
    isGoalsLoading: goalsQuery.isLoading,
    savingsTimeframe,
    excludedNextMonthIds,
    updateSavingsTimeframe,
    updateExcludedNextMonthIds,
    saveBudgets: saveBudgetsMutation.mutateAsync,
    addGoal: addGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
  };
};
