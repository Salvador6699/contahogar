import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subMonths, startOfMonth, format } from "date-fns";
import {
  Hash,
  Search,
  Sparkles,
  Edit2,
  Eye,
  X,
  Loader2,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import TransactionModal from "@/components/TransactionModal";
import { Transaction } from "@/types/finance";
import {
  computeTagStats,
  extractTransactionTags,
  hasQuickExpensePrefix,
  isFuzzyTagMatch,
  normalizeTagKey,
  renameOrMergeTagInCloud,
  cleanupQuickExpensePrefixesInCloud,
  TagStat,
} from "@/lib/tags";
import { formatCurrency } from "@/lib/calculations";
import { appToast as toast } from "@/lib/swal";
import { cn } from "@/lib/utils";
import TransactionList from "@/components/TransactionList";

type TagTimeframe = "1m" | "3m" | "6m" | "12m" | "all";

export function TagManager() {
  const queryClient = useQueryClient();
  const { transactions, updateTransaction: rqUpdateTransaction, deleteTransaction: rqDeleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [timeframe, setTimeframe] = useState<TagTimeframe>("all");
  const [onlyFrequent, setOnlyFrequent] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  // Inspection dialog
  const [viewingTag, setViewingTag] = useState<TagStat | null>(null);

  // Rename / Merge dialog
  const [editingTag, setEditingTag] = useState<TagStat | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);

  // Quick prefix cleanup state
  const [isCleaningPrefixes, setIsCleaningPrefixes] = useState(false);

  const quickPrefixCount = useMemo(
    () => transactions.filter((t) => hasQuickExpensePrefix(t.description)).length,
    [transactions]
  );

  const timeframeTransactions = useMemo(() => {
    const valid = transactions.filter((t) => !t.isPending && !t.isIgnored);
    if (timeframe === "all") return valid;

    const now = new Date();
    const monthsBack =
      timeframe === "1m" ? 0 : timeframe === "3m" ? 2 : timeframe === "6m" ? 5 : 11;
    const minMonth = format(startOfMonth(subMonths(now, monthsBack)), "yyyy-MM");
    return valid.filter((t) => t.date.slice(0, 7) >= minMonth);
  }, [transactions, timeframe]);

  const allTagStats = useMemo(
    () => computeTagStats(timeframeTransactions),
    [timeframeTransactions]
  );

  const visibleTags = useMemo(() => {
    const qNorm = normalizeTagKey(search);
    return allTagStats.filter((t) => {
      if (onlyFrequent && !qNorm && t.count < 2) return false;
      if (qNorm && !isFuzzyTagMatch(qNorm, t.normKey).match) return false;
      return true;
    });
  }, [allTagStats, onlyFrequent, search]);

  // Multi-tag intersection summary (e.g., #Almuerzo + #Trabajo)
  const intersectionResult = useMemo(() => {
    if (selectedFilterTags.length === 0) return null;
    const reqNorms = selectedFilterTags.map(normalizeTagKey);
    const matched = timeframeTransactions.filter((tx) => {
      const txNorms = extractTransactionTags(tx).map(normalizeTagKey);
      return reqNorms.every((r) => txNorms.includes(r));
    });
    const totalExpense = matched
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const totalIncome = matched
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    return {
      transactions: matched.sort((a, b) => b.date.localeCompare(a.date)),
      totalExpense: Number(totalExpense.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
    };
  }, [selectedFilterTags, timeframeTransactions]);

  const toggleFilterTag = (name: string) => {
    const norm = normalizeTagKey(name);
    setSelectedFilterTags((prev) =>
      prev.some((t) => normalizeTagKey(t) === norm)
        ? prev.filter((t) => normalizeTagKey(t) !== norm)
        : [...prev, name]
    );
  };

  const handleRenameOrMerge = async () => {
    if (!editingTag || !newTagName.trim()) return;
    setIsSavingTag(true);
    try {
      const count = await renameOrMergeTagInCloud(
        editingTag.normKey,
        newTagName,
        transactions
      );
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`Etiqueta actualizada en ${count} movimiento(s)`);
      setEditingTag(null);
      setNewTagName("");
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar la etiqueta");
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleCleanupQuickPrefixes = async () => {
    setIsCleaningPrefixes(true);
    try {
      const res = await cleanupQuickExpensePrefixesInCloud(transactions);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(
        `Limpiados ${res.cleaned} movimientos (${res.keptTags} etiquetas útiles conservadas, ${res.clearedRedundant} redundantes vaciados)`
      );
    } catch (e: any) {
      toast.error(e?.message || "Error al limpiar prefijos");
    } finally {
      setIsCleaningPrefixes(false);
    }
  };

  const frequentCount = allTagStats.filter((t) => t.count >= 2).length;

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Mis Etiquetas</h2>
          <p className="text-sm text-muted-foreground">
            Consulta el gasto total por etiqueta, combina varias a la vez o fusiona duplicadas.
          </p>
        </div>

        {/* Timeframe pills */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 self-start sm:self-auto">
          {(
            [
              ["1m", "Mes"],
              ["3m", "3m"],
              ["6m", "6m"],
              ["12m", "1a"],
              ["all", "Todo"],
            ] as [TagTimeframe, string][]
          ).map(([tf, label]) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                timeframe === tf
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legacy "Gasto rápido:" cleanup banner */}
      {quickPrefixCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Limpiar {quickPrefixCount} comentarios antiguos "Gasto rápido: ..."
            </p>
            <p className="text-muted-foreground">
              Quita el prefijo innecesario conservando etiquetas útiles (ej. "Café") y vaciando las redundantes con su categoría (ej. "Compra" en Supermercado o "Tabaco" en tabaco).
            </p>
          </div>
          <Button
            size="sm"
            disabled={isCleaningPrefixes}
            onClick={handleCleanupQuickPrefixes}
            className="rounded-xl shrink-0 gap-1.5"
          >
            {isCleaningPrefixes ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Limpiando...
              </>
            ) : (
              "Limpiar ahora"
            )}
          </Button>
        </div>
      )}

      {/* Search + Frequent/All toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar etiqueta (ej: almuerzo, viaje, café)..."
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <div className="inline-flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => setOnlyFrequent(true)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              onlyFrequent
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Frecuentes ({frequentCount})
          </button>
          <button
            type="button"
            onClick={() => setOnlyFrequent(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              !onlyFrequent
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todas ({allTagStats.length})
          </button>
        </div>
      </div>

      {/* Multi-tag intersection panel */}
      {intersectionResult && (
        <Card className="border border-primary/30 bg-primary/5 rounded-2xl overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold">Combinación activa:</span>
                {selectedFilterTags.map((t) => (
                  <Badge
                    key={t}
                    className="gap-1 cursor-pointer bg-primary text-primary-foreground"
                    onClick={() => toggleFilterTag(t)}
                  >
                    #{t}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedFilterTags([])}
              >
                Limpiar
              </Button>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span>
                <strong>{intersectionResult.transactions.length}</strong> movimiento(s)
              </span>
              {intersectionResult.totalExpense > 0 && (
                <span className="font-black text-rose-600 dark:text-rose-400">
                  Gasto total: {formatCurrency(intersectionResult.totalExpense)}
                </span>
              )}
              {intersectionResult.totalIncome > 0 && (
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  Ingreso total: {formatCurrency(intersectionResult.totalIncome)}
                </span>
              )}
            </div>
            {intersectionResult.transactions.length > 0 && (
              <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                <TransactionList
                  transactions={intersectionResult.transactions}
                  onEdit={(tx) => setEditingTx(tx)}
                  onDelete={async (id) => {
                    await rqDeleteTransaction(id);
                    toast.success("Transacción eliminada");
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tag list */}
      <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          {visibleTags.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {allTagStats.length === 0
                ? "Todavía no hay etiquetas en el periodo seleccionado."
                : "No se encontraron etiquetas con el filtro actual. Prueba cambiando a 'Todas'."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {visibleTags.map((tag) => {
                const isSelected = selectedFilterTags.some(
                  (t) => normalizeTagKey(t) === tag.normKey
                );
                return (
                  <div
                    key={tag.normKey}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3.5 hover:bg-muted/30 transition-colors",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => toggleFilterTag(tag.name)}
                      title="Pulsa para combinar/filtrar por esta etiqueta"
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm truncate">{tag.name}</p>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {tag.count} {tag.count === 1 ? "mov." : "movs."}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {tag.categories.slice(0, 3).join(" · ")}
                          {tag.categories.length > 3 ? ` +${tag.categories.length - 3}` : ""} · Media:{" "}
                          {formatCurrency(tag.avgTicket)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right mr-1">
                        {tag.totalExpense > 0 && (
                          <p className="text-sm font-black text-expense">
                            {formatCurrency(tag.totalExpense)}
                          </p>
                        )}
                        {tag.totalIncome > 0 && (
                          <p className="text-xs font-bold text-income">
                            +{formatCurrency(tag.totalIncome)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Ver movimientos"
                        onClick={() => setViewingTag(tag)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-background"
                        title="Renombrar o fusionar etiqueta"
                        onClick={() => {
                          setEditingTag(tag);
                          setNewTagName(tag.name);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Ver movimientos de una etiqueta */}
      <Dialog open={Boolean(viewingTag)} onOpenChange={(o) => !o && setViewingTag(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              {viewingTag?.name}
            </DialogTitle>
            <DialogDescription>
              {viewingTag?.count} movimiento(s) · Total gasto:{" "}
              {formatCurrency(viewingTag?.totalExpense || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {viewingTag && (
              <TransactionList
                transactions={viewingTag.transactions}
                onEdit={(tx) => {
                  setViewingTag(null);
                  setEditingTx(tx);
                }}
                onDelete={async (id) => {
                  await rqDeleteTransaction(id);
                  toast.success("Transacción eliminada");
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        onSave={async (txData) => {
          if (!editingTx) return;
          await rqUpdateTransaction({ ...txData, id: editingTx.id });
          toast.success("Transacción actualizada");
          setEditingTx(null);
        }}
        type={editingTx?.type || "expense"}
        categories={categories}
        editingTransaction={editingTx}
      />

      {/* Dialog: Renombrar o fusionar etiqueta */}
      <Dialog
        open={Boolean(editingTag)}
        onOpenChange={(o) => {
          if (!o) {
            setEditingTag(null);
            setNewTagName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renombrar o fusionar etiqueta</DialogTitle>
            <DialogDescription>
              Cambia <strong>#{editingTag?.name}</strong> en sus {editingTag?.count} movimiento(s). Si escribes el nombre de otra etiqueta existente, ambas se fusionarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="renameTagInput">Nuevo nombre</Label>
              <Input
                id="renameTagInput"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ej: Almuerzo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>
              Cancelar
            </Button>
            <Button disabled={isSavingTag || !newTagName.trim()} onClick={handleRenameOrMerge}>
              {isSavingTag ? "Guardando..." : "Aplicar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
