import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSearchParams } from '@/hooks/useSearchParams';
import {
  RecurringExpenseRule,
  RecurringExpenseKind,
  RecurrenceFrequency,
  getRecurringRuleKind,
  isRuleIncludedInSavings,
} from "@/types/finance";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useLoans } from "@/hooks/useLoans";
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
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn, parseAmount } from "@/lib/utils";
import { appToast as toast, swalConfirm } from "@/lib/swal";
import { formatCurrency } from "@/lib/calculations";

type RuleFilterTab = "all" | "essential" | "subscription" | "income";

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

export const RecurringExpensesManager = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rules, addRule, updateRule, deleteRule, isLoading: isRulesLoading } = useRecurringRules();
  const { categories, isLoading: isCatLoading } = useCategories();
  const { accounts, isLoading: isAccLoading } = useAccounts();
  const { loans, isLoading: isLoansLoading } = useLoans();

  // Search and UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<RuleFilterTab>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

    const essentialMonthly = essential.reduce((acc, r) => acc + getMonthlyEquivalent(r), 0);
    const subscriptionMonthly = subscription.reduce((acc, r) => acc + getMonthlyEquivalent(r), 0);
    const activeLoans = (loans || []).filter(
      (l) => l.status !== "completed" && l.installmentAmount > 0
    );
    const loansMonthly = activeLoans.reduce(
      (acc, l) => acc + (l.installmentAmount || 0),
      0
    );

    return {
      essential,
      subscription,
      income,
      mortgageRules,
      essentialMonthly,
      subscriptionMonthly,
      activeLoansCount: activeLoans.length,
      loansMonthly,
    };
  }, [rules, loans]);

  if (isRulesLoading || isCatLoading || isAccLoading || isLoansLoading) {
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

    return (
      <div
        key={rule.id}
        className={cn(
          "bg-card rounded-3xl border shadow-sm overflow-hidden transition-all duration-300",
          isExpanded ? "border-primary/30" : "border-border/50 hover:border-primary/20"
        )}
      >
        {/* COMPACT ROW */}
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleRow(rule.id)}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 transition-colors",
                rule.type === "income"
                  ? "bg-income/10 text-income"
                  : ruleKind === "essential"
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
              )}
            >
              {rule.type === "income" ? (
                <Repeat className="w-6 h-6" />
              ) : ruleKind === "essential" ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-base truncate text-foreground/90">{rule.name}</p>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                <span>{getFrequencyLabel(rule)}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="truncate">{rule.category}</span>
                {rule.type === "expense" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span
                      className={cn(
                        "normal-case tracking-normal text-[11px] font-bold px-2 py-0.5 rounded-full border",
                        ruleKind === "essential"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                          : "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20"
                      )}
                    >
                      {ruleKind === "essential" ? "Suministro / Recibo" : "Suscripción"}
                    </span>
                  </>
                )}
                {isRuleIncludedInSavings(rule) && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-primary font-bold inline-flex items-center gap-1 normal-case tracking-normal text-xs bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                      <PiggyBank className="w-3 h-3" />
                      Ahorros y Provisiones
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className={cn(
                "font-black text-xl tabular-nums",
                rule.type === "income" ? "text-income" : "text-expense"
              )}
            >
              {rule.type === "income" ? "+" : "-"}
              {formatCurrency(rule.amount)}
            </p>
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
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                    <div>
                      <span className="font-bold text-foreground block text-sm">
                        {ruleKind === "essential"
                          ? "Suministro / Recibo obligatorio"
                          : "Suscripción cancelable"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {ruleKind === "essential"
                          ? "Luz, agua, internet, seguros u otros recibos del hogar"
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

  const visibleEssential = filteredRules.filter(
    (r) => r.type === "expense" && getRecurringRuleKind(r) === "essential"
  );
  const visibleSubscription = filteredRules.filter(
    (r) => r.type === "expense" && getRecurringRuleKind(r) === "subscription"
  );
  const visibleIncome = filteredRules.filter((r) => r.type === "income");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-32">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-2">
            <Repeat className="w-8 h-8 text-primary" />
            Gastos Fijos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suministros del hogar, suscripciones cancelables e ingresos automáticos.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="font-bold rounded-2xl h-12 px-6 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Añadir Gasto Fijo
        </Button>
      </div>

      {/* KPI Summary Cards */}
      {(rules.length > 0 || summary.activeLoansCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <p className="text-2xl font-black mt-1.5 tabular-nums">
              {formatCurrency(summary.essentialMonthly)}
              <span className="text-xs font-medium text-muted-foreground"> / mes</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Luz, agua, internet, seguros obligatorios
            </p>
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
            <p className="text-2xl font-black mt-1.5 tabular-nums">
              {formatCurrency(summary.subscriptionMonthly)}
              <span className="text-xs font-medium text-muted-foreground"> / mes</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Margen recortable: {formatCurrency(summary.subscriptionMonthly * 12)} / año
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/prestamos" } as any)}
            className="text-left p-4 rounded-2xl border border-border/60 hover:border-primary/40 bg-card transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                Préstamos e Hipoteca
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-2xl font-black mt-1.5 tabular-nums">
              {formatCurrency(summary.loansMonthly)}
              <span className="text-xs font-medium text-muted-foreground"> / mes</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {summary.activeLoansCount} activos · Se gestionan aparte en Préstamos
            </p>
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
                Tienes &ldquo;{summary.mortgageRules[0].name}&rdquo; todavía en Gastos Fijos
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ahora las hipotecas se gestionan de forma autónoma desde Préstamos e Hipoteca (generando sus propios recibos sin estar aquí).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl font-bold shrink-0 border-amber-500/40 bg-background hover:bg-amber-500/15"
            onClick={() => navigate({ to: "/prestamos" } as any)}
          >
            Mover en Préstamos
          </Button>
        </div>
      )}

      {/* Search & Filter Bar */}
      {rules.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar regla o categoría..."
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
              { id: "all" as const, label: `Todos (${rules.length})` },
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

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-card/50 rounded-3xl border border-dashed border-border/60 p-12 text-center flex flex-col items-center justify-center mt-8">
          <Repeat className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-bold text-foreground">No hay gastos fijos</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Crea reglas automáticas para tus suscripciones, suministros o recibos recurrentes y se añadirán solos a tu previsión.
          </p>
          <Button onClick={handleOpenAdd} variant="outline" className="mt-6 rounded-2xl h-11 px-6 font-bold">
            Añadir mi primer gasto fijo
          </Button>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron reglas con los filtros actuales
        </div>
      ) : filterTab === "all" ? (
        <div className="space-y-6">
          {visibleEssential.length > 0 && (
            <div className="space-y-2.5">
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
              <div className="flex flex-col gap-3">{visibleEssential.map(renderRuleRow)}</div>
            </div>
          )}

          {visibleSubscription.length > 0 && (
            <div className="space-y-2.5">
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
              <div className="flex flex-col gap-3">{visibleSubscription.map(renderRuleRow)}</div>
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
                      Luz, agua, internet, seguros obligatorios
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
