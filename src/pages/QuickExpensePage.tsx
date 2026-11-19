import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import * as Icons from "lucide-react";
import {
  CheckCircle2,
  Building2,
  Calendar,
  Trash2,
  Loader2,
  Sparkles,
  ExternalLink,
  Plus,
  LayoutGrid,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { Category } from "@/types/finance";
import {
  formatCurrency,
  calculateAccountBalance,
  calculatePendingImpact,
} from "@/lib/calculations";
import { cn, parseAmount, withKeyboardClose } from "@/lib/utils";
import { appToast as toast, swalConfirm } from "@/lib/swal";

const LAST_ACCOUNT_KEY = "contahogar_quick_last_account";
const LAST_CATEGORY_KEY = "contahogar_quick_last_category";
const VISIBLE_CATEGORIES_KEY = "contahogar_quick_visible_categories";
const LONG_PRESS_MS = 5000;
const LONG_PRESS_VISUAL_DELAY_MS = 300;

const QuickExpensePage = () => {
  const { accounts, isLoading: isAccLoading } = useAccounts();
  const { categories, isLoading: isCatLoading } = useCategories();
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    isLoading: isTxLoading,
  } = useTransactions();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const currentMonthKey = format(new Date(), "yyyy-MM");

  const [amount, setAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_ACCOUNT_KEY) || "";
    } catch {
      return "";
    }
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_CATEGORY_KEY) || "";
    } catch {
      return "";
    }
  });
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [isFutureExpense, setIsFutureExpense] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedBanner, setLastSavedBanner] = useState<string | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  // Visible category IDs configured by the user (null = not initialized yet)
  const [visibleCategoryIds, setVisibleCategoryIds] = useState<string[] | null>(
    () => {
      try {
        const raw = localStorage.getItem(VISIBLE_CATEGORIES_KEY);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
  );

  // Long-press state for removing a visible category (5 seconds)
  const [holdingCategoryId, setHoldingCategoryId] = useState<string | null>(
    null
  );
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const persistVisibleCategoryIds = useCallback((ids: string[]) => {
    setVisibleCategoryIds(ids);
    try {
      localStorage.setItem(VISIBLE_CATEGORIES_KEY, JSON.stringify(ids));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Initialize visible categories on first visit with up to 3 common ones
  useEffect(() => {
    if (isCatLoading || categories.length === 0) return;
    if (visibleCategoryIds !== null) return;

    const priorityKeywords = ["super", "aliment", "compra", "restaur", "casa"];
    const prioritized = categories.filter((c) =>
      priorityKeywords.some((kw) => c.name.toLowerCase().includes(kw))
    );
    const initial = (prioritized.length > 0 ? prioritized : categories)
      .slice(0, 3)
      .map((c) => c.id);
    persistVisibleCategoryIds(initial);
  }, [categories, isCatLoading, visibleCategoryIds, persistVisibleCategoryIds]);

  const visibleCategories = useMemo(() => {
    if (visibleCategoryIds === null) return [];
    const idSet = new Set(visibleCategoryIds);
    return categories.filter((c) => idSet.has(c.id));
  }, [categories, visibleCategoryIds]);

  const hiddenCategories = useMemo(() => {
    if (visibleCategoryIds === null) return categories;
    const idSet = new Set(visibleCategoryIds);
    return categories.filter((c) => !idSet.has(c.id));
  }, [categories, visibleCategoryIds]);

  // Default account if none saved or saved one was deleted
  useEffect(() => {
    if (isAccLoading || accounts.length === 0) return;
    const exists = accounts.some((a) => a.id === selectedAccountId);
    if (!exists) {
      const cashAccount = accounts.find(
        (a) => a.name.toLowerCase() === "efectivo"
      );
      setSelectedAccountId(cashAccount?.id || accounts[0].id);
    }
  }, [accounts, isAccLoading, selectedAccountId]);

  // Keep selectedCategory aligned with visible categories
  useEffect(() => {
    if (isCatLoading || visibleCategoryIds === null) return;
    if (visibleCategories.length === 0) {
      if (selectedCategory !== "") setSelectedCategory("");
      return;
    }
    const existsInVisible = visibleCategories.some(
      (c) => c.name === selectedCategory
    );
    if (!existsInVisible) {
      const supermercado = visibleCategories.find((c) =>
        c.name.toLowerCase().includes("super")
      );
      setSelectedCategory(supermercado?.name || visibleCategories[0].name);
    }
  }, [visibleCategories, isCatLoading, selectedCategory, visibleCategoryIds]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingCategoryId(null);
    setHoldProgress(0);
    holdOriginRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const handleRemoveVisibleCategory = useCallback(
    (cat: Category) => {
      const current = visibleCategoryIds ?? [];
      const next = current.filter((id) => id !== cat.id);
      persistVisibleCategoryIds(next);
      try {
        navigator.vibrate?.(50);
      } catch {
        // ignore vibration errors
      }
      toast.info(
        "Categoría quitada",
        `"${cat.name}" volvió a Elegir categorías`
      );
    },
    [visibleCategoryIds, persistVisibleCategoryIds]
  );

  const handleAddVisibleCategory = (cat: Category) => {
    const current = visibleCategoryIds ?? [];
    if (!current.includes(cat.id)) {
      persistVisibleCategoryIds([...current, cat.id]);
    }
    handleSelectCategory(cat.name);
  };

  const startHold = (
    cat: Category,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    cancelHold();
    suppressNextClickRef.current = false;
    holdStartRef.current = Date.now();
    holdOriginRef.current = { x: e.clientX, y: e.clientY };
    setHoldingCategoryId(cat.id);
    setHoldProgress(0);

    holdTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      if (elapsed >= LONG_PRESS_MS) {
        suppressNextClickRef.current = true;
        cancelHold();
        handleRemoveVisibleCategory(cat);
      } else if (elapsed >= LONG_PRESS_VISUAL_DELAY_MS) {
        const pct =
          ((elapsed - LONG_PRESS_VISUAL_DELAY_MS) /
            (LONG_PRESS_MS - LONG_PRESS_VISUAL_DELAY_MS)) *
          100;
        setHoldProgress(Math.min(100, Math.max(0, pct)));
      }
    }, 50);
  };

  const handleHoldMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!holdOriginRef.current) return;
    const dx = Math.abs(e.clientX - holdOriginRef.current.x);
    const dy = Math.abs(e.clientY - holdOriginRef.current.y);
    if (dx > 12 || dy > 12) {
      cancelHold();
    }
  };

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, id);
    } catch {
      // ignore storage errors
    }
  };

  const handleSelectCategory = (name: string) => {
    setSelectedCategory(name);
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, name);
    } catch {
      // ignore storage errors
    }
  };

  const parsedAmount = parseAmount(amount);
  const canSave =
    !isSaving &&
    parsedAmount > 0 &&
    Boolean(selectedAccountId) &&
    Boolean(selectedCategory) &&
    Boolean(date);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    try {
      await addTransaction({
        type: "expense",
        amount: parsedAmount,
        accountId: selectedAccountId,
        category: selectedCategory,
        date,
        description: note.trim() || undefined,
        isPending: isFutureExpense,
      });

      const accName =
        accounts.find((a) => a.id === selectedAccountId)?.name || "";
      const summaryText = `${formatCurrency(parsedAmount)} en ${selectedCategory}${accName ? ` (${accName})` : ""}${isFutureExpense ? " · futuro" : ""}`;

      setLastSavedBanner(summaryText);
      toast.success("Gasto guardado", summaryText);
      setAmount("");
      setNote("");
      setDate(todayStr);
      setShowCustomDate(false);
      setIsFutureExpense(false);
    } catch (error) {
      console.error("Error al guardar gasto rápido:", error);
      toast.error("No se pudo guardar el gasto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecent = async (id: string, label: string) => {
    const confirmed = await swalConfirm(
      "¿Borrar este gasto?",
      `Se eliminará "${label}".`
    );
    if (!confirmed) return;

    try {
      await deleteTransaction(id);
      toast.success("Gasto eliminado");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  // Show today's expenses so she can verify or undo a typo
  const todaysExpenses = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.date === todayStr &&
          !t.isPending &&
          !t.isIgnored
      )
      .slice(0, 6);
  }, [transactions, todayStr]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const accountBalancesMap = useMemo(() => {
    const map = new Map<
      string,
      { balance: number; projectedBalance: number }
    >();
    accounts.forEach((account) => {
      const bal = calculateAccountBalance(
        account,
        transactions,
        false,
        currentMonthKey
      );
      const pendingImpact = calculatePendingImpact(
        transactions,
        currentMonthKey,
        account.id
      );
      map.set(account.id, {
        balance: bal,
        projectedBalance: Number((bal + pendingImpact).toFixed(2)),
      });
    });
    return map;
  }, [accounts, transactions, currentMonthKey]);

  const isLoading = isAccLoading || isCatLoading;

  return (
    <div className="min-h-screen app-gradient-bg flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-md space-y-5">
        {/* Minimal Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ContaHogar"
              className="w-9 h-9 rounded-xl shadow-sm object-contain bg-card p-1"
            />
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">
                Apuntar gasto
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            title="Ir a la app completa"
          >
            <span>App completa</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </header>

        {/* Success Confirmation Banner */}
        {lastSavedBanner && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-sm font-semibold leading-snug">
              ¡Apuntado! {lastSavedBanner}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando cuentas y categorías...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. AMOUNT */}
            <div className="rounded-3xl bg-card/85 backdrop-blur-sm border border-border/60 shadow-sm p-5 space-y-2">
              <label
                htmlFor="quick-amount"
                className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground text-center"
              >
                ¿Cuánto has gastado?
              </label>
              <div className="relative flex items-center justify-center">
                <input
                  ref={amountInputRef}
                  id="quick-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (lastSavedBanner) setLastSavedBanner(null);
                  }}
                  className="w-full text-center text-4xl sm:text-5xl font-black tracking-tight bg-transparent border-none outline-none py-2 placeholder:text-muted-foreground/30 tabular-nums"
                  autoFocus
                />
                <span className="text-2xl sm:text-3xl font-black text-muted-foreground ml-1 select-none">
                  €
                </span>
              </div>
            </div>

            {/* 2. ACCOUNT (Bank / Cash) */}
            <div className="space-y-2">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground px-1">
                ¿Con qué pagas?
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {accounts.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  const balInfo = accountBalancesMap.get(acc.id);
                  const balance = balInfo
                    ? acc.linkedAccountId
                      ? balInfo.projectedBalance
                      : balInfo.balance
                    : 0;
                  const projectedBalance = balInfo
                    ? balInfo.projectedBalance
                    : 0;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectAccount(acc.id)}
                      className={cn(
                        "flex flex-col justify-between gap-2 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-card/70 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 w-full">
                        {acc.logo ? (
                          <img
                            src={acc.logo}
                            alt={acc.name}
                            className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 shrink-0"
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              isSelected
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                        )}
                        <span
                          className={cn(
                            "font-bold text-sm leading-tight truncate",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {acc.name}
                        </span>
                      </div>

                      <div className="flex flex-col leading-tight pt-0.5 border-t border-border/40 w-full">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Saldo
                          </span>
                          <span
                            className={cn(
                              "text-sm font-black tabular-nums",
                              balance < 0
                                ? "text-destructive"
                                : isSelected
                                  ? "text-primary"
                                  : "text-foreground"
                            )}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-1 mt-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            Futuro
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold tabular-nums",
                              projectedBalance < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatCurrency(projectedBalance)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CATEGORY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  ¿En qué?
                </span>
                <button
                  type="button"
                  onClick={() => setIsCategoryPickerOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Elegir categorías
                </button>
              </div>

              {visibleCategories.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsCategoryPickerOpen(true)}
                  className="w-full p-6 rounded-2xl border-2 border-dashed border-border/70 bg-card/50 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center gap-2 text-center"
                >
                  <LayoutGrid className="w-6 h-6 text-primary" />
                  <span className="text-sm font-bold">
                    Toca aquí para elegir tus categorías
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Pon solo las que más usas (ej: Supermercado, Farmacia...)
                  </span>
                </button>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {visibleCategories.map((cat) => {
                      const isSelected = selectedCategory === cat.name;
                      const isHolding = holdingCategoryId === cat.id;
                      const IconComp =
                        (Icons as Record<string, any>)[cat.icon || "Tag"] ||
                        Icons.Tag;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onPointerDown={(e) => startHold(cat, e)}
                          onPointerMove={handleHoldMove}
                          onPointerUp={cancelHold}
                          onPointerCancel={cancelHold}
                          onPointerLeave={cancelHold}
                          onContextMenu={(e) => e.preventDefault()}
                          onClick={() => {
                            if (suppressNextClickRef.current) {
                              suppressNextClickRef.current = false;
                              return;
                            }
                            handleSelectCategory(cat.name);
                          }}
                          className={cn(
                            "relative overflow-hidden select-none touch-pan-y flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 min-h-[78px]",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/60 bg-card/70 hover:border-primary/40",
                            isHolding &&
                              holdProgress > 0 &&
                              "border-destructive/70 bg-destructive/5"
                          )}
                        >
                          {cat.customIcon ? (
                            <img
                              src={cat.customIcon}
                              alt={cat.name}
                              className="w-6 h-6 object-contain pointer-events-none"
                            />
                          ) : (
                            <IconComp
                              className="w-6 h-6 pointer-events-none"
                              style={
                                cat.color && !isSelected
                                  ? { color: cat.color }
                                  : undefined
                              }
                            />
                          )}
                          <span
                            className={cn(
                              "text-xs font-bold text-center leading-tight line-clamp-2 pointer-events-none",
                              isSelected ? "text-primary" : "text-foreground"
                            )}
                          >
                            {cat.name}
                          </span>
                          {isHolding && holdProgress > 0 && (
                            <div
                              className="absolute bottom-0 left-0 h-1.5 bg-destructive transition-[width] duration-75"
                              style={{ width: `${holdProgress}%` }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 text-center pt-0.5">
                    Mantén pulsada 5 segundos una categoría para quitarla
                  </p>
                </>
              )}
            </div>

            {/* 4. OPTIONAL NOTE & DATE */}
            <div className="space-y-2.5">
              <Input
                type="text"
                placeholder="Nota opcional (ej: Mercadona, pan...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-12 rounded-2xl bg-card/80 border-border/60 text-base px-4"
              />

              <div className="flex items-center justify-between gap-2 flex-wrap px-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setDate(todayStr);
                      setShowCustomDate(false);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                      date === todayStr && !showCustomDate
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDate(yesterdayStr);
                      setShowCustomDate(false);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                      date === yesterdayStr && !showCustomDate
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Ayer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomDate((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors",
                      showCustomDate ||
                        (date !== todayStr && date !== yesterdayStr)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    Otra fecha
                  </button>
                </div>

                <label
                  htmlFor="quick-future-expense"
                  className="inline-flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded-full hover:bg-muted/60 transition-colors"
                >
                  <Checkbox
                    id="quick-future-expense"
                    checked={isFutureExpense}
                    onCheckedChange={(checked) =>
                      setIsFutureExpense(checked === true)
                    }
                  />
                  <span className="text-xs font-bold text-foreground">
                    Gasto futuro
                  </span>
                </label>
              </div>

              {showCustomDate && (
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-2xl bg-card/80 border-border/60"
                />
              )}
            </div>

            {/* 5. SUBMIT BUTTON */}
            <Button
              type="button"
              disabled={!canSave}
              onPointerDown={() => withKeyboardClose(() => handleSave())}
              onClick={() => withKeyboardClose(() => handleSave())}
              className="w-full h-14 rounded-2xl text-base font-black shadow-lg active:scale-[0.99] transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {parsedAmount > 0
                    ? `Guardar gasto de ${formatCurrency(parsedAmount)}`
                    : "Guardar gasto"}
                </>
              )}
            </Button>
          </form>
        )}

        {/* Recent Today's Expenses (for peace of mind & easy undo) */}
        {!isTxLoading && todaysExpenses.length > 0 && (
          <section className="pt-2 space-y-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground px-1">
              Apuntados hoy
            </h2>
            <div className="rounded-2xl bg-card/65 border border-border/50 divide-y divide-border/40 overflow-hidden">
              {todaysExpenses.map((tx) => {
                const accName = accountMap.get(tx.accountId) || "";
                const label = `${tx.category} (${formatCurrency(tx.amount)})`;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {tx.category}
                        {tx.description ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {tx.description}
                          </span>
                        ) : null}
                      </p>
                      {accName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {accName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black tabular-nums">
                        {formatCurrency(tx.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecent(tx.id, label)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Borrar gasto"
                        aria-label={`Borrar ${label}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Category Picker Modal */}
      <ResponsiveDialog
        open={isCategoryPickerOpen}
        onOpenChange={setIsCategoryPickerOpen}
      >
        <ResponsiveDialogContent className="sm:max-w-[440px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Elegir categorías</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Toca las categorías que quieras añadir a tu panel rápido.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {hiddenCategories.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold">
                Ya tienes todas las categorías visibles
              </p>
              <p className="text-xs text-muted-foreground">
                Si quieres quitar alguna, mantenla pulsada 5 segundos en la
                pantalla principal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto py-2 pr-1">
              {hiddenCategories.map((cat) => {
                const IconComp =
                  (Icons as Record<string, any>)[cat.icon || "Tag"] ||
                  Icons.Tag;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleAddVisibleCategory(cat)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 border-border/60 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95 min-h-[78px]"
                  >
                    {cat.customIcon ? (
                      <img
                        src={cat.customIcon}
                        alt={cat.name}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <IconComp
                        className="w-6 h-6"
                        style={cat.color ? { color: cat.color } : undefined}
                      />
                    )}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
};

export default QuickExpensePage;
