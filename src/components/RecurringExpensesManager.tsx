import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from '@/hooks/useSearchParams';
import { LoansSection } from "@/pages/LoansPage";
import {
  RecurringExpenseRule,
  RecurringExpenseKind,
  RecurrenceFrequency,
  Transaction,
  Loan,
  MortgageMetadata,
  getRecurringRuleKind,
  isRuleIncludedInSavings,
} from "@/types/finance";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useLoans } from "@/hooks/useLoans";
import { useTransactions } from "@/hooks/useTransactions";
import { usePlanning } from "@/hooks/usePlanning";
import {
  calculateSavingsProvisions,
  type UnifiedSavingsGoal,
} from "@/lib/savingsCalculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Edit2,
  Trash2,
  Calendar,
  PlusCircle,
  Search,
  X,
  Repeat,
  CreditCard,
  Tag,
  PiggyBank,
  Zap,
  Sparkles,
  Landmark,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Scissors,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as Icons from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn, parseAmount } from "@/lib/utils";
import { appToast as toast, swalConfirm } from "@/lib/swal";
import { formatCurrency } from "@/lib/calculations";

export type RuleFilterTab = "all" | "loans" | "essential" | "subscription" | "income";

export interface RecurringExpensesManagerProps {
  initialTab?: RuleFilterTab;
}

const getMonthlyEquivalent = (rule: RecurringExpenseRule): number => {
  if (rule.frequency === "weekly") return rule.amount * (52 / 12);
  if (rule.frequency === "yearly") return rule.amount / 12;
  if (rule.frequency === "custom") {
    const interval = Math.max(1, rule.customInterval || 1);
    if (rule.customIntervalUnit === "days") return (rule.amount * 30.4375) / interval;
    if (rule.customIntervalUnit === "years") return rule.amount / (interval * 12);
    return rule.amount / interval;
  }
  return rule.amount;
};

/** Returns true for periodic/annual expenses (yearly, quarterly/multi-month, >31 days). */
const isPeriodicOrAnnualRule = (rule: RecurringExpenseRule): boolean => {
  if (rule.frequency === "yearly") return true;
  if (rule.frequency === "custom") {
    const interval = rule.customInterval || 1;
    if (rule.customIntervalUnit === "years") return true;
    if (rule.customIntervalUnit === "months" && interval > 1) return true;
    if (rule.customIntervalUnit === "days" && interval > 31) return true;
  }
  return false;
};

interface RuleSavingsStatus {
  ruleId: string;
  goals: UnifiedSavingsGoal[];
  nextGoal?: UnifiedSavingsGoal;
  targetTotal: number;
  allocatedTotal: number;
  missingTotal: number;
  suggestedMonthlyTotal: number;
}

interface KindBreakdown {
  rules: RecurringExpenseRule[];
  pureMonthly: number;
  periodicRules: RecurringExpenseRule[];
  periodicProratedMonthly: number;
  periodicAnnualTotal: number;
  totalMonthly: number;
  targetTotal: number;
  allocatedTotal: number;
  missingTotal: number;
  suggestedMonthlyTotal: number;
  uncoveredMonthlyNeeded: number;
  coveragePct: number;
}

/** Splits rules into pure monthly vs periodic/annual and aggregates savings coverage. */
const computeKindBreakdown = (
  list: RecurringExpenseRule[],
  ruleCoverageMap: Map<string, RuleSavingsStatus>
): KindBreakdown => {
  let pureMonthly = 0;
  const periodicRules: RecurringExpenseRule[] = [];
  let periodicProratedMonthly = 0;

  let targetTotal = 0;
  let allocatedTotal = 0;
  let missingTotal = 0;
  let suggestedMonthlyTotal = 0;
  let untrackedMonthly = 0;

  list.forEach((rule) => {
    const monthlyEq = getMonthlyEquivalent(rule);
    if (!isPeriodicOrAnnualRule(rule)) {
      pureMonthly += monthlyEq;
      return;
    }

    periodicRules.push(rule);
    periodicProratedMonthly += monthlyEq;

    if (!isRuleIncludedInSavings(rule)) {
      untrackedMonthly += monthlyEq;
      return;
    }

    const status = ruleCoverageMap.get(rule.id);
    if (status) {
      targetTotal += status.targetTotal;
      allocatedTotal += status.allocatedTotal;
      missingTotal += status.missingTotal;
      suggestedMonthlyTotal += status.suggestedMonthlyTotal;
    }
  });

  const uncoveredMonthlyNeeded = suggestedMonthlyTotal + untrackedMonthly;
  const coveragePct =
    targetTotal > 0 ? Math.min(100, Math.round((allocatedTotal / targetTotal) * 100)) : 0;

  return {
    rules: list,
    pureMonthly,
    periodicRules,
    periodicProratedMonthly,
    periodicAnnualTotal: periodicProratedMonthly * 12,
    totalMonthly: pureMonthly + periodicProratedMonthly,
    targetTotal,
    allocatedTotal,
    missingTotal,
    suggestedMonthlyTotal,
    uncoveredMonthlyNeeded,
    coveragePct,
  };
};

/** Mirrors LoansSection completion rules so paid-off loans never inflate active totals. */
const isLoanActive = (
  loan: Loan,
  transactions: Transaction[],
  rules: RecurringExpenseRule[]
): boolean => {
  if (loan.status === "completed" || (loan.installmentAmount || 0) <= 0) {
    return false;
  }

  const meta = loan.originalTransactionData as MortgageMetadata | undefined;
  if (meta?.isMortgage) {
    const rule = meta.linkedRuleId
      ? rules.find((r) => r.id === meta.linkedRuleId)
      : undefined;

    const confirmedCount = transactions.filter((t) => {
      if (t.isPending || t.type !== "expense" || t.isIgnored || t.amount <= 0) return false;
      if (t.date < meta.baselineDate) return false;
      if (t.linkedLoanId === loan.id || t.id.startsWith(`rec_loan_${loan.id}_`)) return true;
      if (meta.linkedRuleId && t.id.startsWith(`rec_${meta.linkedRuleId}_`)) return true;
      if (!meta.linkedRuleId || !rule) {
        const desc = `${t.description || ""} ${t.category || ""}`.toLowerCase();
        if (t.accountId === loan.accountId && desc.includes("hipoteca")) return true;
      }
      return false;
    }).length;

    const paidInstallments = meta.paidInstallmentsBaseline + confirmedCount;
    const remainingInstallments = Math.max(0, loan.installments - paidInstallments);
    const amortizedPrincipal = Number(
      Math.min(
        loan.amount,
        meta.amortizedPrincipalBaseline +
          confirmedCount * (meta.currentPrincipalPortion || 0)
      ).toFixed(2)
    );
    const pendingPrincipal = Number(Math.max(0, loan.amount - amortizedPrincipal).toFixed(2));
    return remainingInstallments > 0 && pendingPrincipal > 0;
  }

  const totalReal = loan.installments * loan.installmentAmount + (loan.setupFee || 0);
  const amountPaid =
    transactions
      .filter((t) => t.linkedLoanId === loan.id && t.type === "expense" && !t.isPending)
      .reduce((acc, t) => acc + t.amount, 0) + (loan.startingPaidAmount || 0);

  return amountPaid < totalReal - 0.01;
};

const getFrequencyLabel = (rule: RecurringExpenseRule): string => {
  if (rule.frequency === "monthly") return "Mensual";
  if (rule.frequency === "weekly") return "Semanal";
  if (rule.frequency === "yearly") return "Anual";
  return `Cada ${rule.customInterval} ${
    rule.customIntervalUnit === "days"
      ? "días"
      : rule.customIntervalUnit === "months"
      ? "meses"
      : "años"
  }`;
};

type ProgressionStatus = "up" | "down" | "same";

interface RuleProgression {
  status: ProgressionStatus;
  diff: number;
  pct: number;
  prevAmount?: number;
  recentHistory: Transaction[];
}

const getRuleProgression = (
  rule: RecurringExpenseRule,
  transactions: Transaction[]
): RuleProgression => {
  const normalizedName = rule.name.trim().toLowerCase();
  const history = transactions
    .filter(
      (t) =>
        !t.isPending &&
        !t.isIgnored &&
        t.type === rule.type &&
        t.amount > 0 &&
        (t.id.startsWith(`rec_${rule.id}_`) ||
          (t.description && t.description.trim().toLowerCase() === normalizedName))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const recentHistory = history.slice(-4).reverse();

  if (history.length === 0) {
    return { status: "same", diff: 0, pct: 0, recentHistory };
  }

  const lastTx = history[history.length - 1];
  let currentAmount = rule.amount;
  let prevAmount: number | undefined;

  if (Math.abs(rule.amount - lastTx.amount) > 0.01) {
    prevAmount = lastTx.amount;
  } else if (history.length >= 2) {
    currentAmount = lastTx.amount;
    prevAmount = history[history.length - 2].amount;
  }

  if (prevAmount === undefined || prevAmount <= 0) {
    return { status: "same", diff: 0, pct: 0, recentHistory };
  }

  const diff = Number((currentAmount - prevAmount).toFixed(2));
  if (Math.abs(diff) <= 0.01) {
    return { status: "same", diff: 0, pct: 0, prevAmount, recentHistory };
  }

  const pct = (diff / prevAmount) * 100;
  return {
    status: diff > 0 ? "up" : "down",
    diff,
    pct,
    prevAmount,
    recentHistory,
  };
};

interface PeriodicityGroup {
  key: string;
  label: string;
  rules: RecurringExpenseRule[];
  monthlyTotal: number;
}

const groupRulesByPeriodicity = (list: RecurringExpenseRule[]): PeriodicityGroup[] => {
  const buckets: { key: string; label: string; rules: RecurringExpenseRule[] }[] = [
    { key: "monthly", label: "Mensuales", rules: [] },
    { key: "periodic", label: "Trimestrales y Periódicos", rules: [] },
    { key: "yearly", label: "Anuales", rules: [] },
    { key: "weekly", label: "Semanales", rules: [] },
  ];

  list.forEach((rule) => {
    if (rule.frequency === "monthly") buckets[0].rules.push(rule);
    else if (rule.frequency === "custom") buckets[1].rules.push(rule);
    else if (rule.frequency === "yearly") buckets[2].rules.push(rule);
    else if (rule.frequency === "weekly") buckets[3].rules.push(rule);
    else buckets[0].rules.push(rule);
  });

  return buckets
    .filter((b) => b.rules.length > 0)
    .map((b) => ({
      ...b,
      monthlyTotal: b.rules.reduce((sum, r) => sum + getMonthlyEquivalent(r), 0),
    }));
};

export const RecurringExpensesManager = ({
  initialTab = "all",
}: RecurringExpensesManagerProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { rules, addRule, updateRule, deleteRule, isLoading: isRulesLoading } = useRecurringRules();
  const { categories, isLoading: isCatLoading } = useCategories();
  const { accounts, isLoading: isAccLoading } = useAccounts();
  const { loans, isLoading: isLoansLoading } = useLoans();
  const { transactions, isLoading: isTxLoading } = useTransactions();
  const { goals, savingsTimeframe, isGoalsLoading } = usePlanning();

  // Search and UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<RuleFilterTab>(initialTab);
  const [simulatedCancelIds, setSimulatedCancelIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    setFilterTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "all" ||
      tabParam === "loans" ||
      tabParam === "essential" ||
      tabParam === "subscription" ||
      tabParam === "income"
    ) {
      setFilterTab(tabParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("tab");
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  // Form State
  const [editingRule, setEditingRule] = useState<RecurringExpenseRule | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [kind, setKind] = useState<RecurringExpenseKind>("essential");
  const [hasManualKind, setHasManualKind] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [customInterval, setCustomInterval] = useState("1");
  const [customIntervalUnit, setCustomIntervalUnit] = useState<"days" | "months" | "years">("months");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [includeInSavings, setIncludeInSavings] = useState(false);

  useEffect(() => {
    const editRuleId = searchParams.get("editRuleId");
    if (editRuleId && rules.length > 0) {
      const targetRule = rules.find((r) => r.id === editRuleId);
      if (targetRule) {
        handleEdit(targetRule);
        
        // Remove editRuleId from url to prevent re-opening modal on every load
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("editRuleId");
        setSearchParams(newParams);
      }
    }
  }, [searchParams, rules, setSearchParams]);

  const handleEdit = (rule: RecurringExpenseRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setAmount(rule.amount.toString());
    setCategory(rule.category);
    setAccountId(rule.accountId);
    setType(rule.type);
    setKind(getRecurringRuleKind(rule));
    setHasManualKind(true);
    setFrequency(rule.frequency);
    setCustomInterval(rule.customInterval?.toString() || "1");
    setCustomIntervalUnit(rule.customIntervalUnit || "months");
    setStartDate(rule.startDate);
    setIncludeInSavings(isRuleIncludedInSavings(rule));
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategory("");
    setType("expense");
    setKind("subscription");
    setHasManualKind(false);
    setFrequency("monthly");
    setCustomInterval("1");
    setCustomIntervalUnit("months");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setIncludeInSavings(false);
  };

  const suggestKindForDraft = (draftName: string, draftCategory: string) => {
    if (editingRule || hasManualKind) return;
    const guessed = getRecurringRuleKind({
      id: "",
      name: draftName,
      category: draftCategory,
      amount: 0,
      accountId: "",
      frequency: "monthly",
      startDate,
      type: "expense",
    });
    setKind(guessed);
  };

  const handleOpenAdd = () => {
    setEditingRule(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setTimeout(resetForm, 300); // wait for modal close animation
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await swalConfirm(
      "¿Eliminar regla recurrente?",
      "Se borrarán todos los cobros futuros pendientes generados por esta regla.",
      "Sí, eliminar"
    );
    if (confirmed) {
      await deleteRule(id);
      toast.success("Automatización eliminada");
      if (editingRule?.id === id) {
        handleCancelModal();
      }
    }
  };

  const handleSave = async () => {
    if (!name || !amount || !category || !accountId || !startDate) {
      toast.error("Por favor completa todos los campos obligatorios.");
      return;
    }

    const numAmount = parseAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Introduce un importe válido.");
      return;
    }

    const resolvedKind = type === "expense" ? kind : undefined;

    if (editingRule) {
      await updateRule({
        ...editingRule,
        name,
        category,
        accountId,
        type,
        kind: resolvedKind,
        amount: numAmount,
        frequency,
        customInterval: frequency === "custom" ? parseInt(customInterval) || 1 : undefined,
        customIntervalUnit: frequency === "custom" ? customIntervalUnit : undefined,
        startDate: startDate,
        includeInSavings,
      });
      toast.success("Automatización actualizada");
    } else {
      await addRule({
        name,
        amount: numAmount,
        category,
        accountId,
        type,
        kind: resolvedKind,
        frequency,
        customInterval: frequency === "custom" ? parseInt(customInterval) || 1 : undefined,
        customIntervalUnit: frequency === "custom" ? customIntervalUnit : undefined,
        startDate,
        includeInSavings,
      });
      toast.success("Automatización creada");
    }

    handleCancelModal();
  };

  const toggleRow = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  const savingsProvisions = useMemo(
    () =>
      calculateSavingsProvisions(
        accounts,
        transactions,
        goals || [],
        rules || [],
        savingsTimeframe
      ),
    [accounts, transactions, goals, rules, savingsTimeframe]
  );

  const ruleCoverageMap = useMemo(() => {
    const map = new Map<string, RuleSavingsStatus>();
    const grouped = new Map<string, UnifiedSavingsGoal[]>();

    savingsProvisions.unifiedGoals.forEach((g) => {
      if (!g.isVirtual || !g.ruleId || g.isIgnored) return;
      const bucket = grouped.get(g.ruleId) || [];
      bucket.push(g);
      grouped.set(g.ruleId, bucket);
    });

    grouped.forEach((ruleGoals, ruleId) => {
      const sorted = [...ruleGoals].sort((a, b) =>
        (a.deadline || "").localeCompare(b.deadline || "")
      );
      map.set(ruleId, {
        ruleId,
        goals: sorted,
        nextGoal: sorted[0],
        targetTotal: sorted.reduce((acc, g) => acc + g.targetAmount, 0),
        allocatedTotal: sorted.reduce((acc, g) => acc + g.allocatedAmount, 0),
        missingTotal: sorted.reduce((acc, g) => acc + g.missingAmount, 0),
        suggestedMonthlyTotal: sorted.reduce((acc, g) => acc + g.suggestedMonthly, 0),
      });
    });

    return map;
  }, [savingsProvisions.unifiedGoals]);

  const summary = useMemo(() => {
    const essential = rules.filter(
      (r) => r.type === "expense" && getRecurringRuleKind(r) === "essential"
    );
    const subscription = rules.filter(
      (r) => r.type === "expense" && getRecurringRuleKind(r) === "subscription"
    );
    const income = rules.filter((r) => r.type === "income");
    const mortgageRules = rules.filter(
      (r) => r.type === "expense" && r.name.toLowerCase().includes("hipoteca")
    );

    const essentialBreakdown = computeKindBreakdown(essential, ruleCoverageMap);
    const subscriptionBreakdown = computeKindBreakdown(subscription, ruleCoverageMap);
    const activeLoans = (loans || []).filter((l) => isLoanActive(l, transactions, rules));
    const loansMonthly = activeLoans.reduce(
      (acc, l) => acc + (l.installmentAmount || 0),
      0
    );

    const pureTotalMonthly =
      loansMonthly + essentialBreakdown.pureMonthly + subscriptionBreakdown.pureMonthly;
    const totalPeriodicProratedMonthly =
      essentialBreakdown.periodicProratedMonthly +
      subscriptionBreakdown.periodicProratedMonthly;
    const totalTarget =
      essentialBreakdown.targetTotal + subscriptionBreakdown.targetTotal;
    const totalAllocated =
      essentialBreakdown.allocatedTotal + subscriptionBreakdown.allocatedTotal;
    const totalMissing =
      essentialBreakdown.missingTotal + subscriptionBreakdown.missingTotal;
    const totalUncoveredMonthlyNeeded =
      essentialBreakdown.uncoveredMonthlyNeeded +
      subscriptionBreakdown.uncoveredMonthlyNeeded;
    const totalCoveragePct =
      totalTarget > 0 ? Math.min(100, Math.round((totalAllocated / totalTarget) * 100)) : 0;

    return {
      essential,
      subscription,
      income,
      mortgageRules,
      essentialMonthly: essentialBreakdown.totalMonthly,
      subscriptionMonthly: subscriptionBreakdown.totalMonthly,
      essentialBreakdown,
      subscriptionBreakdown,
      activeLoansCount: activeLoans.length,
      loansMonthly,
      pureTotalMonthly,
      totalPeriodicProratedMonthly,
      totalTarget,
      totalAllocated,
      totalMissing,
      totalUncoveredMonthlyNeeded,
      totalCoveragePct,
    };
  }, [rules, loans, transactions, ruleCoverageMap]);

  const progressionByRuleId = useMemo(() => {
    const map = new Map<string, RuleProgression>();
    rules.forEach((rule) => {
      map.set(rule.id, getRuleProgression(rule, transactions));
    });
    return map;
  }, [rules, transactions]);

  const simulatedStats = useMemo(() => {
    const selected = summary.subscription.filter((r) => simulatedCancelIds.includes(r.id));
    const monthlySaving = selected.reduce((sum, r) => sum + getMonthlyEquivalent(r), 0);
    return {
      count: selected.length,
      monthlySaving,
      annualSaving: monthlySaving * 12,
      remainingMonthly: Math.max(0, summary.subscriptionMonthly - monthlySaving),
    };
  }, [summary.subscription, summary.subscriptionMonthly, simulatedCancelIds]);

  const toggleSimulatedCancel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSimulatedCancelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (
    isRulesLoading ||
    isCatLoading ||
    isAccLoading ||
    isLoansLoading ||
    isTxLoading ||
    isGoalsLoading
  ) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  const normalizedQuery = searchQuery.toLowerCase();
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(normalizedQuery) ||
      rule.category.toLowerCase().includes(normalizedQuery);
    if (!matchesSearch) return false;
    if (filterTab === "income") return rule.type === "income";
    if (filterTab === "essential") {
      return rule.type === "expense" && getRecurringRuleKind(rule) === "essential";
    }
    if (filterTab === "subscription") {
      return rule.type === "expense" && getRecurringRuleKind(rule) === "subscription";
    }
    return true;
  });

  const renderRuleRow = (rule: RecurringExpenseRule) => {
    const isExpanded = expandedRow === rule.id;
    const account = accounts.find((a) => a.id === rule.accountId);
    const ruleKind = getRecurringRuleKind(rule);
    const nextKind: RecurringExpenseKind =
      ruleKind === "essential" ? "subscription" : "essential";
    const monthlyEq = getMonthlyEquivalent(rule);
    const annualSaving = monthlyEq * 12;
    const progression = progressionByRuleId.get(rule.id) || {
      status: "same" as const,
      diff: 0,
      pct: 0,
      recentHistory: [],
    };
    const isSimulatedCancelled =
      ruleKind === "subscription" && simulatedCancelIds.includes(rule.id);
    const isPeriodic = rule.type === "expense" && isPeriodicOrAnnualRule(rule);
    const ruleSavings = isPeriodic ? ruleCoverageMap.get(rule.id) : undefined;
    const nextSavingsGoal = ruleSavings?.nextGoal;

    const matchedCategory = categories.find(
      (c) => c.name.trim().toLowerCase() === rule.category.trim().toLowerCase()
    );
    const ruleNameLower = rule.name.trim().toLowerCase();
    const specificIconName = (() => {
      if (ruleNameLower.includes("seguro coche")) return "Car";
      if (ruleNameLower.includes("seguro hogar")) return "ShieldCheck";
      if (ruleNameLower.includes("ibi") && ruleNameLower.includes("coche")) return "Car";
      if (ruleNameLower === "itv" || ruleNameLower.includes(" itv")) return "Wrench";
      return undefined;
    })();
    const iconName =
      specificIconName ||
      matchedCategory?.icon ||
      (rule.type === "income" ? "Repeat" : ruleKind === "essential" ? "Zap" : "Sparkles");
    const RuleIconComponent = (Icons as any)[iconName] || Tag;
    const badgeColor =
      matchedCategory?.color && matchedCategory.color !== "#94a3b8"
        ? matchedCategory.color
        : undefined;

    return (
      <div
        key={rule.id}
        className={cn(
          "bg-card rounded-3xl border shadow-sm overflow-hidden transition-all duration-300",
          isSimulatedCancelled
            ? "border-emerald-500/45 bg-emerald-500/[0.03]"
            : isExpanded
            ? "border-primary/30"
            : "border-border/50 hover:border-primary/20"
        )}
      >
        {/* COMPACT ROW */}
        <div
          className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleRow(rule.id)}
        >
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {matchedCategory?.customIcon && !specificIconName ? (
              <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm border border-border/50 flex-shrink-0 mt-0.5 bg-muted">
                <img
                  src={matchedCategory.customIcon}
                  alt={matchedCategory.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : badgeColor ? (
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 text-white transition-colors mt-0.5"
                style={{ backgroundColor: badgeColor }}
              >
                <RuleIconComponent className="w-5 h-5" />
              </div>
            ) : (
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 transition-colors mt-0.5",
                  rule.type === "income"
                    ? "bg-income/10 text-income"
                    : ruleKind === "essential"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                )}
              >
                <RuleIconComponent className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-extrabold text-base truncate text-foreground/90",
                  isSimulatedCancelled && "line-through text-muted-foreground"
                )}
              >
                {rule.name}
              </p>

              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 flex-wrap mt-1">
                <span className="uppercase tracking-wider">{getFrequencyLabel(rule)}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="truncate uppercase tracking-wider">{rule.category}</span>
                {account && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="inline-flex items-center gap-1 text-foreground/80">
                      {account.logo && (
                        <img
                          src={account.logo}
                          alt=""
                          className="w-3.5 h-3.5 rounded-full object-cover bg-white shrink-0"
                        />
                      )}
                      <span className="truncate max-w-[90px]">{account.name}</span>
                    </span>
                  </>
                )}

                {rule.type === "expense" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
                      progression.status === "up"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                        : progression.status === "down"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                        : "bg-muted/60 text-muted-foreground border-border/60"
                    )}
                  >
                    {progression.status === "up" ? (
                      <>
                        <TrendingUp className="w-3 h-3" />
                        <span>
                          Subiendo +{formatCurrency(Math.abs(progression.diff))} (+
                          {Math.abs(progression.pct).toFixed(1)}%)
                        </span>
                      </>
                    ) : progression.status === "down" ? (
                      <>
                        <TrendingDown className="w-3 h-3" />
                        <span>
                          Bajando -{formatCurrency(Math.abs(progression.diff))} (-
                          {Math.abs(progression.pct).toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3" />
                        <span>Pagando lo mismo</span>
                      </>
                    )}
                  </span>
                )}

                {isRuleIncludedInSavings(rule) && (
                  <span className="text-primary font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10">
                    <PiggyBank className="w-3 h-3" />
                    Provisiones
                  </span>
                )}

                {isPeriodic && nextSavingsGoal && (
                  <span
                    className={cn(
                      "font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full border tabular-nums",
                      nextSavingsGoal.missingAmount <= 0.01
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                    )}
                  >
                    <PiggyBank className="w-3 h-3 shrink-0" />
                    {nextSavingsGoal.missingAmount <= 0.01 ? (
                      <span>
                        Cubierto en Ahorros ({formatCurrency(nextSavingsGoal.allocatedAmount)}/
                        {formatCurrency(nextSavingsGoal.targetAmount)})
                      </span>
                    ) : (
                      <span>
                        Ahorro: {formatCurrency(nextSavingsGoal.allocatedAmount)}/
                        {formatCurrency(nextSavingsGoal.targetAmount)}
                        {nextSavingsGoal.suggestedMonthly > 0.01
                          ? ` · Apartar ${formatCurrency(nextSavingsGoal.suggestedMonthly)}/mes`
                          : " · Sin provisión"}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {rule.type === "expense" && ruleKind === "subscription" && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => toggleSimulatedCancel(rule.id, e)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                      isSimulatedCancelled
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:border-violet-500/40 hover:text-foreground"
                    )}
                  >
                    <Scissors className="w-3 h-3 shrink-0" />
                    <span>
                      {isSimulatedCancelled
                        ? `Baja simulada · Ahorras ${formatCurrency(annualSaving)}/año`
                        : `¿Y si la dejo? · Ahorras ${formatCurrency(annualSaving)}/año`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setSimulatedCancelIds((prev) => prev.filter((id) => id !== rule.id));
                      await updateRule({ ...rule, kind: "essential" });
                      toast.success("Movido a Suministros y Recibos");
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15 transition-all cursor-pointer"
                  >
                    <Zap className="w-3 h-3 shrink-0" />
                    <span>Es obligatorio · Pasar a Recibos</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="text-right">
              <p
                className={cn(
                  "font-black text-lg sm:text-xl tabular-nums leading-none",
                  isSimulatedCancelled
                    ? "text-emerald-600 dark:text-emerald-400"
                    : rule.type === "income"
                    ? "text-income"
                    : "text-expense"
                )}
              >
                {rule.type === "income" ? "+" : "-"}
                {formatCurrency(rule.amount)}
              </p>
              {rule.frequency !== "monthly" && (
                <span className="text-[10px] font-semibold text-muted-foreground block mt-0.5 tabular-nums">
                  equiv. {formatCurrency(monthlyEq)}/mes
                </span>
              )}
            </div>
            <span className="text-muted-foreground p-1">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
        </div>

        {/* EXPANDED DETAILS */}
        {isExpanded && (
          <div className="p-4 pt-3 border-t border-border/30 bg-muted/5 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
              <div className="flex flex-col gap-3 flex-1 text-sm bg-background/50 p-4 rounded-2xl border border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Fecha de Inicio</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {format(new Date(rule.startDate), "dd 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Cuenta</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {account?.name || "Cuenta eliminada"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    <span className="font-medium">Categoría</span>
                  </div>
                  <span className="font-bold text-foreground">{rule.category}</span>
                </div>

                {rule.type === "expense" && (
                  <div className="pt-2 border-t border-border/30 space-y-1.5">
                    <span className="text-xs font-bold text-foreground block">
                      Historial reciente de recibos
                    </span>
                    {progression.recentHistory.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground block">
                        Aún no hay recibos confirmados anteriores para comparar evolución.
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {progression.recentHistory.map((tx) => (
                          <span
                            key={tx.id}
                            className="text-[11px] px-2.5 py-1 rounded-xl bg-muted/60 border border-border/50 tabular-nums"
                          >
                            {format(new Date(tx.date), "dd MMM yyyy", { locale: es })}:{" "}
                            <strong className="text-foreground">
                              {formatCurrency(tx.amount)}
                            </strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {rule.type === "expense" && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                    <div>
                      <span className="font-bold text-foreground block text-sm">
                        {ruleKind === "essential"
                          ? "Suministro / Recibo obligatorio"
                          : "Suscripción cancelable"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {ruleKind === "essential"
                          ? "Luz, agua, internet, estudios, seguros u otros recibos del hogar"
                          : "Servicio sin compromiso que puedes cancelar si quieres ahorrar"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs font-bold shrink-0"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await updateRule({ ...rule, kind: nextKind });
                        toast.success(
                          nextKind === "essential"
                            ? "Movido a Suministros y Recibos"
                            : "Movido a Suscripciones Cancelables"
                        );
                      }}
                    >
                      {ruleKind === "essential" ? "Pasar a Suscripción" : "Pasar a Suministro"}
                    </Button>
                  </div>
                )}

                {rule.type === "expense" && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-primary" />
                      <div>
                        <span className="font-bold text-foreground block text-sm">Ahorros y Provisiones</span>
                        <span className="text-[11px] text-muted-foreground">
                          {isRuleIncludedInSavings(rule)
                            ? "Activado: planifica y reserva fondos mes a mes en Ahorros y Provisiones"
                            : "Desactivado: no se incluye en Ahorros y Provisiones"}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={isRuleIncludedInSavings(rule)}
                      onCheckedChange={async (checked) => {
                        await updateRule({ ...rule, includeInSavings: checked });
                        toast.success(
                          checked
                            ? "Incluido en Ahorros y Provisiones"
                            : "Excluido de Ahorros y Provisiones"
                        );
                      }}
                    />
                  </div>
                )}

                {isPeriodic && nextSavingsGoal && (
                  <div className="pt-2 border-t border-border/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">
                        Cobertura con tu ahorro
                        {nextSavingsGoal.deadline
                          ? ` (${format(new Date(nextSavingsGoal.deadline), "dd MMM yyyy", {
                              locale: es,
                            })})`
                          : ""}
                      </span>
                      <span
                        className={cn(
                          "font-black tabular-nums",
                          nextSavingsGoal.missingAmount <= 0.01
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {nextSavingsGoal.missingAmount <= 0.01
                          ? "Cubierto 100%"
                          : nextSavingsGoal.suggestedMonthly > 0.01
                          ? `Apartar ${formatCurrency(nextSavingsGoal.suggestedMonthly)} / mes`
                          : "Sin provisión mensual activa"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Asignado en Ahorros:{" "}
                      <strong className="text-foreground">
                        {formatCurrency(nextSavingsGoal.allocatedAmount)}
                      </strong>{" "}
                      de {formatCurrency(nextSavingsGoal.targetAmount)}
                      {nextSavingsGoal.missingAmount > 0.01 &&
                        ` · Faltan ${formatCurrency(nextSavingsGoal.missingAmount)} (${nextSavingsGoal.monthsLeft} ${
                          nextSavingsGoal.monthsLeft === 1 ? "mes" : "meses"
                        })`}
                    </p>
                    {ruleSavings && ruleSavings.goals.length > 1 && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        En tu horizonte ({ruleSavings.goals.length} cobros):{" "}
                        {formatCurrency(ruleSavings.allocatedTotal)} /{" "}
                        {formatCurrency(ruleSavings.targetTotal)} cubiertos · Apartar total{" "}
                        {formatCurrency(ruleSavings.suggestedMonthlyTotal)}/mes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                className="h-10 px-4 rounded-xl hover:bg-primary/10 text-primary transition-colors font-bold border border-transparent hover:border-primary/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(rule);
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="ghost"
                className="h-10 px-4 rounded-xl text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-bold"
                onClick={(e) => handleDelete(rule.id, e)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPeriodicitySections = (list: RecurringExpenseRule[]) => {
    const groups = groupRulesByPeriodicity(list);
    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.label} ({group.rules.length})
              </span>
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                {group.key === "monthly"
                  ? `${formatCurrency(group.monthlyTotal)} / mes (mensual puro)`
                  : `${formatCurrency(group.monthlyTotal)} / mes prorrateado (${formatCurrency(
                      group.monthlyTotal * 12
                    )} / año)`}
              </span>
            </div>
            <div className="flex flex-col gap-3">{group.rules.map(renderRuleRow)}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderSubscriptionSimulatorBanner = (alwaysShowHint: boolean) => {
    if (simulatedStats.count === 0) {
      if (!alwaysShowHint || summary.subscription.length === 0) return null;
      return (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <Scissors className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
          <span>
            Pulsa <strong className="text-foreground">&ldquo;¿Y si la dejo?&rdquo;</strong> en cualquier suscripción para simular exactamente cuánto ahorrarías al mes y al año al cancelarla.
          </span>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <Scissors className="w-3.5 h-3.5" />
            <span>
              Simulación de baja ({simulatedStats.count}{" "}
              {simulatedStats.count === 1 ? "suscripción" : "suscripciones"})
            </span>
          </div>
          <p className="text-sm font-bold text-foreground tabular-nums">
            Ahorrarías +{formatCurrency(simulatedStats.monthlySaving)} / mes ·{" "}
            <span className="text-emerald-700 dark:text-emerald-300">
              +{formatCurrency(simulatedStats.annualSaving)} / año
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Nuevo gasto en suscripciones tras la baja:{" "}
            <strong className="text-foreground">
              {formatCurrency(simulatedStats.remainingMonthly)} / mes
            </strong>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSimulatedCancelIds([])}
          className="rounded-xl text-xs font-bold border-emerald-500/40 bg-background hover:bg-emerald-500/15 shrink-0 gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer</span>
        </Button>
      </div>
    );
  };

  const visibleEssential = filteredRules.filter(
    (r) => r.type === "expense" && getRecurringRuleKind(r) === "essential"
  );
  const visibleSubscription = filteredRules.filter(
    (r) => r.type === "expense" && getRecurringRuleKind(r) === "subscription"
  );
  const visibleIncome = filteredRules.filter((r) => r.type === "income");

  const renderPeriodicSavingsSummary = (breakdown: KindBreakdown) => {
    if (breakdown.periodicRules.length === 0) {
      return (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          100% mensual puro (sin recibos periódicos ni anuales)
        </p>
      );
    }

    return (
      <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          Periódicos/Anuales ({breakdown.periodicRules.length}):{" "}
          <strong className="text-foreground">
            +{formatCurrency(breakdown.periodicProratedMonthly)}/mes
          </strong>{" "}
          ({formatCurrency(breakdown.periodicAnnualTotal)}/año)
        </p>
        {breakdown.targetTotal > 0 &&
        breakdown.missingTotal <= 0.01 &&
        breakdown.uncoveredMonthlyNeeded <= 0.01 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 tabular-nums">
            <PiggyBank className="w-3 h-3 shrink-0" />
            Cubierto 100% con tu ahorro (0 €/mes a apartar)
          </span>
        ) : breakdown.targetTotal > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 tabular-nums">
            <PiggyBank className="w-3 h-3 shrink-0" />
            Tu ahorro cubre {breakdown.coveragePct}% ({formatCurrency(breakdown.allocatedTotal)}/
            {formatCurrency(breakdown.targetTotal)})
            {breakdown.uncoveredMonthlyNeeded > 0.01
              ? ` · Apartar ${formatCurrency(breakdown.uncoveredMonthlyNeeded)}/mes`
              : " · Modo sin provisión"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-muted/60 text-muted-foreground border-border/60 tabular-nums">
            <PiggyBank className="w-3 h-3 shrink-0" />
            Sin provisión activa en Ahorros · Equiv.{" "}
            {formatCurrency(breakdown.periodicProratedMonthly)}/mes
          </span>
        )}
      </div>
    );
  };

  const handleOpenAddLoan = () => {
    if (filterTab !== "all" && filterTab !== "loans") {
      setFilterTab("loans");
    }
    setIsLoanModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-32">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2.5">
            <Repeat className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            <span>Gastos Fijos y Préstamos</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hipoteca, préstamos, suministros obligatorios y suscripciones en un único centro.
          </p>
          {(rules.length > 0 || summary.activeLoansCount > 0) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
                <span className="text-muted-foreground font-medium">Compromiso mensual directo:</span>
                <strong className="font-black text-foreground tabular-nums">
                  {formatCurrency(summary.pureTotalMonthly)} / mes
                </strong>
              </div>
              {summary.totalPeriodicProratedMonthly > 0 && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs",
                    summary.totalTarget > 0 &&
                      summary.totalMissing <= 0.01 &&
                      summary.totalUncoveredMonthlyNeeded <= 0.01
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                  )}
                >
                  <PiggyBank className="w-3.5 h-3.5 shrink-0" />
                  {summary.totalTarget > 0 &&
                  summary.totalMissing <= 0.01 &&
                  summary.totalUncoveredMonthlyNeeded <= 0.01 ? (
                    <span className="font-bold tabular-nums">
                      Anuales/periódicos (+{formatCurrency(summary.totalPeriodicProratedMonthly)}/mes): Cubiertos 100% con Ahorros (0 €/mes a apartar)
                    </span>
                  ) : (
                    <span className="font-bold tabular-nums">
                      Provisión anuales/periódicos: +{formatCurrency(summary.totalUncoveredMonthlyNeeded)}/mes a apartar (Ahorro cubre {summary.totalCoveragePct}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={handleOpenAddLoan}
            className="font-bold rounded-2xl h-11 px-4 border-primary/30 hover:bg-primary/5 transition-all flex-1 sm:flex-initial"
          >
            <Landmark className="w-4 h-4 mr-2 text-primary" />
            Préstamo / Hipoteca
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="font-bold rounded-2xl h-11 px-5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex-1 sm:flex-initial"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Añadir Gasto Fijo
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {(rules.length > 0 || summary.activeLoansCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setFilterTab((prev) => (prev === "loans" ? "all" : "loans"))}
            className={cn(
              "text-left p-4 rounded-2xl border bg-card transition-all cursor-pointer",
              filterTab === "loans"
                ? "border-primary/60 ring-1 ring-primary/30"
                : "border-border/60 hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                Préstamos e Hipoteca
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                {summary.activeLoansCount} activos
              </span>
            </div>
            <p className="text-2xl font-black mt-1.5 tabular-nums">
              {formatCurrency(summary.loansMonthly)}
              <span className="text-xs font-medium text-muted-foreground"> / mes</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Hipoteca, cuotas y pagos fraccionados
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab((prev) => (prev === "essential" ? "all" : "essential"))}
            className={cn(
              "text-left p-4 rounded-2xl border bg-card transition-all cursor-pointer",
              filterTab === "essential"
                ? "border-sky-500/60 ring-1 ring-sky-500/30"
                : "border-border/60 hover:border-sky-500/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Suministros y Recibos
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                {summary.essential.length} reglas
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-2xl font-black tabular-nums">
                {formatCurrency(summary.essentialBreakdown.pureMonthly)}
                <span className="text-xs font-medium text-muted-foreground"> / mes</span>
              </p>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600/90 dark:text-sky-400">
                Mensual puro
              </span>
            </div>
            {renderPeriodicSavingsSummary(summary.essentialBreakdown)}
          </button>

          <button
            type="button"
            onClick={() => setFilterTab((prev) => (prev === "subscription" ? "all" : "subscription"))}
            className={cn(
              "text-left p-4 rounded-2xl border bg-card transition-all cursor-pointer",
              filterTab === "subscription"
                ? "border-violet-500/60 ring-1 ring-violet-500/30"
                : "border-border/60 hover:border-violet-500/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Suscripciones Cancelables
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                {summary.subscription.length} reglas
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-2xl font-black tabular-nums">
                {formatCurrency(summary.subscriptionBreakdown.pureMonthly)}
                <span className="text-xs font-medium text-muted-foreground"> / mes</span>
              </p>
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600/90 dark:text-violet-400">
                Mensual puro
              </span>
            </div>
            {renderPeriodicSavingsSummary(summary.subscriptionBreakdown)}
            {summary.subscriptionMonthly > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                Margen recortable total: {formatCurrency(summary.subscriptionMonthly * 12)} / año
              </p>
            )}
          </button>
        </div>
      )}

      {/* Alert if a mortgage rule still remains in Gastos Fijos */}
      {summary.mortgageRules.length > 0 && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">
                Tienes &ldquo;{summary.mortgageRules[0].name}&rdquo; todavía como regla recurrente
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pásala a la sección de Préstamos e Hipoteca aquí arriba para ver su amortización, intereses y cuotas sin duplicar recibos.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl font-bold shrink-0 border-amber-500/40 bg-background hover:bg-amber-500/15"
            onClick={() => setFilterTab("loans")}
          >
            Ir a Préstamos e Hipoteca
          </Button>
        </div>
      )}

      {/* Search & Filter Bar */}
      {(rules.length > 0 || loans.length > 0) && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar préstamo, suministro o suscripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-11 h-11 bg-card border-border/50 font-medium rounded-2xl shadow-sm focus-visible:ring-primary/20 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all" as const, label: `Todos (${rules.length + summary.activeLoansCount})` },
              { id: "loans" as const, label: `Préstamos e Hipoteca (${summary.activeLoansCount})` },
              { id: "essential" as const, label: `Suministros (${summary.essential.length})` },
              { id: "subscription" as const, label: `Suscripciones (${summary.subscription.length})` },
              { id: "income" as const, label: `Ingresos (${summary.income.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  filterTab === tab.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unified Body */}
      {filterTab === "loans" ? (
        <LoansSection
          embedded
          searchQuery={searchQuery}
          externalModalOpen={isLoanModalOpen}
          onExternalModalClose={() => setIsLoanModalOpen(false)}
          onExternalModalOpen={() => setIsLoanModalOpen(true)}
        />
      ) : filterTab === "all" ? (
        <div className="space-y-8">
          <LoansSection
            embedded
            searchQuery={searchQuery}
            externalModalOpen={isLoanModalOpen}
            onExternalModalClose={() => setIsLoanModalOpen(false)}
            onExternalModalOpen={() => setIsLoanModalOpen(true)}
          />

          {rules.length === 0 ? (
            <div className="bg-card/50 rounded-3xl border border-dashed border-border/60 p-8 text-center flex flex-col items-center justify-center">
              <Repeat className="w-12 h-12 text-muted-foreground/25 mb-3" />
              <p className="text-base font-bold text-foreground">No hay suministros ni suscripciones</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md">
                Añade aquí tus recibos del hogar (luz, agua, internet) y suscripciones para ver tu compromiso fijo completo.
              </p>
              <Button onClick={handleOpenAdd} variant="outline" className="mt-4 rounded-2xl h-10 px-5 font-bold text-xs">
                Añadir primer gasto fijo
              </Button>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No se encontraron suministros ni suscripciones para &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="space-y-6">
              {visibleEssential.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Suministros y Recibos Obligatorios ({visibleEssential.length})
                    </h3>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                      {formatCurrency(
                        visibleEssential.reduce((sum, r) => sum + getMonthlyEquivalent(r), 0)
                      )}{" "}
                      / mes
                    </span>
                  </div>
                  {renderPeriodicitySections(visibleEssential)}
                </div>
              )}

              {visibleSubscription.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Suscripciones Cancelables ({visibleSubscription.length})
                    </h3>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                      {formatCurrency(
                        visibleSubscription.reduce((sum, r) => sum + getMonthlyEquivalent(r), 0)
                      )}{" "}
                      / mes
                    </span>
                  </div>
                  {renderSubscriptionSimulatorBanner(false)}
                  {renderPeriodicitySections(visibleSubscription)}
                </div>
              )}

              {visibleIncome.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-income flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5" />
                      Ingresos Automáticos ({visibleIncome.length})
                    </h3>
                  </div>
                  <div className="flex flex-col gap-3">{visibleIncome.map(renderRuleRow)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron reglas con los filtros actuales
        </div>
      ) : filterTab === "essential" ? (
        <div className="space-y-4">{renderPeriodicitySections(filteredRules)}</div>
      ) : filterTab === "subscription" ? (
        <div className="space-y-4">
          {renderSubscriptionSimulatorBanner(true)}
          {renderPeriodicitySections(filteredRules)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">{filteredRules.map(renderRuleRow)}</div>
      )}

      {/* MODAL FOR ADD/EDIT */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancelModal()}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden">
          <DialogHeader className="pt-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {editingRule ? (
                <>
                  <Edit2 className="w-5 h-5 text-primary" />
                  Editar Gasto Fijo
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-primary" />
                  Nuevo Gasto Fijo
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
            <div className="space-y-2">
              <Label>Nombre / Concepto</Label>
              <Input
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  suggestKindForDraft(val, category);
                }}
                placeholder="Ej: Luz, Orange, Spotify, Gimnasio..."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Importe (€)</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 rounded-xl font-black text-lg pl-8"
                  enterKeyHint="done"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={frequency}
                  onValueChange={(v: RecurrenceFrequency) => {
                    setFrequency(v);
                    if (!editingRule) {
                      setIncludeInSavings(v === "yearly" || v === "custom");
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {frequency === "custom" && (
              <div className="flex gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in">
                <div className="space-y-2 flex-1">
                  <Label>Cada</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(e.target.value)}
                    className="h-11 rounded-xl"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Unidad</Label>
                  <Select
                    value={customIntervalUnit}
                    onValueChange={(v: "days" | "months" | "years") => setCustomIntervalUnit(v)}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Días</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                      <SelectItem value="years">Años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={category}
                onValueChange={(val) => {
                  setCategory(val);
                  suggestKindForDraft(name, val);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuenta de cargo</Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v: "income" | "expense") => setType(v)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gasto (-)</SelectItem>
                  <SelectItem value="income">Ingreso (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CLASIFICACIÓN: SUMINISTRO / SUSCRIPCIÓN */}
            {type === "expense" && (
              <div className="space-y-2">
                <Label>Clasificación del gasto</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setKind("essential");
                      setHasManualKind(true);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-2xl border text-left transition-all cursor-pointer",
                      kind === "essential"
                        ? "border-sky-500 bg-sky-500/10 text-foreground"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <Zap className="w-3.5 h-3.5" />
                      Suministro / Recibo
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      Luz, agua, internet, estudios, seguros obligatorios
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKind("subscription");
                      setHasManualKind(true);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-2xl border text-left transition-all cursor-pointer",
                      kind === "subscription"
                        ? "border-violet-500 bg-violet-500/10 text-foreground"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Suscripción
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      Gemini, Spotify, gimnasio (cancelable)
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TOGGLE INCLUIR EN AHORROS / PROVISIONES */}
            {type === "expense" && (
              <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <div>
                    <Label htmlFor="include-in-savings" className="font-bold text-sm cursor-pointer">
                      Incluir en Ahorros y Provisiones
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      Planifica y reserva fondos mes a mes en la sección de Ahorros para cubrir este gasto.
                    </p>
                  </div>
                </div>
                <Switch
                  id="include-in-savings"
                  checked={includeInSavings}
                  onCheckedChange={setIncludeInSavings}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/30 mt-2">
            <Button
              variant="ghost"
              onClick={handleCancelModal}
              className="rounded-xl h-11 px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button 
              className="rounded-xl px-6 h-11 font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90" 
              onClick={handleSave}
            >
              {editingRule ? "Guardar Cambios" : "Crear Regla"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
