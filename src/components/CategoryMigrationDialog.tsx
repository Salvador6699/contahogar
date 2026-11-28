import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FolderTree,
  GitMerge,
  Scale,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  buildMigrationPlan,
  executeMigrationPlan,
  MigrationPlan,
  MigrationExecutionResult,
} from "@/lib/categoryMigration";
import { getFullCloudData } from "@/api/local/snapshots";
import { formatCurrency } from "@/lib/calculations";
import { appToast as toast } from "@/lib/swal";
import { cn } from "@/lib/utils";

interface CategoryMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryMigrationDialog({
  open,
  onOpenChange,
}: CategoryMigrationDialogProps) {
  const queryClient = useQueryClient();
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [result, setResult] = useState<MigrationExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingPlan(true);
    setError(null);
    setResult(null);

    getFullCloudData()
      .then((data) => {
        if (!cancelled) {
          setPlan(buildMigrationPlan(data));
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "No se pudo analizar los datos en la nube.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPlan(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleRunMigration = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const execResult = await executeMigrationPlan();
      setResult(execResult);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["recurring_rules"] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
      ]);
      if (execResult.allBalancesMatch) {
        toast.success("Migración completada con saldos verificados al céntimo");
      } else {
        toast.info("Migración completada. Revisa el detalle de verificación de saldos.");
      }
    } catch (e: any) {
      setError(e?.message || "Error durante la migración.");
      toast.error(e?.message || "Error durante la migración.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isExecuting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Asistente de Reestructuración Contable (Fase 2)
          </DialogTitle>
          <DialogDescription>
            Crea un snapshot de seguridad en la nube antes de aplicar la jerarquía de 2 niveles,
            fusionar duplicados, separar préstamos y netear devengos de nómina.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPlan && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm font-medium">Analizando tus transacciones y categorías reales...</p>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* RESULTADO FINAL TRAS EJECUTAR */}
        {result && (
          <div className="space-y-4 py-2">
            <div
              className={cn(
                "p-4 rounded-2xl border flex items-start gap-3",
                result.allBalancesMatch
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100"
              )}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1 text-sm">
                <p className="font-bold">
                  {result.allBalancesMatch
                    ? "Migración completada y saldos verificados al céntimo (0,00 € de diferencia)"
                    : "Migración completada — revisa la tabla de saldos"}
                </p>
                <p className="text-xs opacity-80">
                  Snapshot de seguridad guardado antes de migrar (ID: {result.snapshotId.slice(0, 8)}…).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xl font-black text-primary">{result.groupsCreated}</p>
                <p className="text-[11px] text-muted-foreground">Grupos creados</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xl font-black text-primary">{result.categoriesUpdated}</p>
                <p className="text-[11px] text-muted-foreground">Subcategorías clasificadas</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xl font-black text-primary">{result.devengosNetted}</p>
                <p className="text-[11px] text-muted-foreground">Devengos neteados</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xl font-black text-primary">{result.financingTransactionsMoved}</p>
                <p className="text-[11px] text-muted-foreground">Préstamos separados</p>
              </div>
            </div>

            {/* Tabla de verificación de saldos por cuenta */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="px-3.5 py-2 bg-muted/40 border-b border-border/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Verificación de Saldos por Cuenta (Antes vs. Después)
              </div>
              <div className="divide-y divide-border/40 text-xs">
                {result.balanceChecks.map((chk) => (
                  <div key={chk.accountId} className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="font-semibold">{chk.accountName}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-muted-foreground">{formatCurrency(chk.before)}</span>
                      <span>→</span>
                      <span className="font-bold">{formatCurrency(chk.after)}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          Math.abs(chk.diff) < 0.005
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        )}
                      >
                        {chk.diff === 0 ? "0,00 €" : formatCurrency(chk.diff)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA PREVIA ANTES DE EJECUTAR */}
        {!isLoadingPlan && plan && !result && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Respaldo automático:</strong> al confirmar, primero se guardará una copia completa en
                <em> Máquina del Tiempo (cloud_snapshots)</em> y al terminar se verificará que el saldo de
                cada cuenta siga siendo idéntico al céntimo.
              </span>
            </div>

            {!plan.hasPendingWork ? (
              <div className="p-6 text-center rounded-2xl border border-border/60 bg-muted/20 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm">Tu catálogo ya está organizado y migrado</p>
                <p className="text-xs text-muted-foreground">
                  No quedan grupos pendientes de crear, duplicados ni ajustes de devengos por aplicar.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* 1. Grupos */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-primary" />
                      1. Jerarquía (Grupos y Subcategorías)
                    </span>
                    <Badge variant="secondary">
                      +{plan.groupsToCreate.length} grupos · {plan.categoriesToClassifyCount} subcats
                    </Badge>
                  </div>
                  {plan.groupsToCreate.length > 0 && (
                    <p className="text-muted-foreground">
                      Se crearán: {plan.groupsToCreate.map((g) => g.name).join(", ")}.
                    </p>
                  )}
                </div>

                {/* 2. Duplicados */}
                {plan.duplicateCleanups.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-primary" />
                        2. Fusión de duplicados y espacios
                      </span>
                      <Badge variant="secondary">{plan.duplicateCleanups.length} correcciones</Badge>
                    </div>
                    <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                      {plan.duplicateCleanups.map((d) => (
                        <li key={d.targetName}>
                          {d.rawNames.map((n) => `"${n}"`).join(", ")} →{" "}
                          <strong className="text-foreground">"{d.targetName}"</strong> ({d.affectedTxCount} movs)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. Devengos nomina */}
                {plan.devengoPairs.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                        3. Ajuste neto de Devengos nómina (Opción A)
                      </span>
                      <Badge variant="secondary">{plan.devengoPairs.length} meses</Badge>
                    </div>
                    <div className="space-y-1 text-muted-foreground font-mono text-[11px]">
                      {plan.devengoPairs.map((p) => (
                        <div key={p.devengoTx.id} className="flex items-center justify-between">
                          <span>{p.incomeTx.date} (Salvador)</span>
                          <span>
                            {formatCurrency(p.incomeTx.amount)} − {formatCurrency(p.devengoTx.amount)} ={" "}
                            <strong className="text-foreground">{formatCurrency(p.newIncomeAmount)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Financiación / Préstamos */}
                {plan.financingSplits.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        4. Separación de Préstamos y Financiación
                      </span>
                      <Badge variant="secondary">{plan.financingSplits.length} movs</Badge>
                    </div>
                    <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                      {plan.financingSplits.map((s) => (
                        <li key={s.tx.id}>
                          {s.tx.date} · {formatCurrency(s.tx.amount)} ({s.tx.category}) →{" "}
                          <strong className="text-foreground">{s.targetCategory}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Aviso informativo de transferencias sin contrapartida */}
            {plan.unmatchedTransfers.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs text-amber-950 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Aviso informativo: {plan.unmatchedTransfers.length} transferencia sin contrapartida (no se modifica automáticamente)
                </p>
                {plan.unmatchedTransfers.map((u) => (
                  <p key={u.tx.id} className="font-mono text-[11px] opacity-90">
                    • {u.tx.date} | {u.tx.type === "expense" ? "Salida" : "Entrada"} | {u.accountName} |{" "}
                    {formatCurrency(u.tx.amount)} {u.tx.description ? `(${u.tx.description})` : ""}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" disabled={isExecuting} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {plan?.hasPendingWork && (
                <Button disabled={isExecuting || isLoadingPlan} onClick={handleRunMigration} className="gap-2">
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aplicando migración...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Crear Snapshot y Aplicar Migración
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
