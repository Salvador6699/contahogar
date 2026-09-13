import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/calculations';
import { PiggyBank, Plus, Minus, Trash2, Check, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  currentAmount: number;
  spent: number;
  disponibleParaAsignar: number;
  monthLabel: string;
  onSave: (categoryName: string, amount: number) => Promise<void> | void;
  onRemove?: (categoryName: string) => Promise<void> | void;
}

export const BudgetAssignmentModal = ({
  isOpen,
  onClose,
  categoryName,
  currentAmount,
  spent,
  disponibleParaAsignar,
  monthLabel,
  onSave,
  onRemove,
}: BudgetAssignmentModalProps) => {
  const [amountStr, setAmountStr] = useState('');
  const [deltaInput, setDeltaInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr(currentAmount > 0 ? currentAmount.toString() : '');
      setDeltaInput('');
    }
  }, [isOpen, currentAmount]);

  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
  const resto = Number((parsedAmount - spent).toFixed(2));

  // Aplicar un cambio arbitrario (+53, -27, etc.)
  const handleApplyCustomDelta = (isSubtract: boolean) => {
    const val = parseFloat(deltaInput.replace(',', '.'));
    if (isNaN(val) || val === 0) return;
    const delta = isSubtract ? -Math.abs(val) : Math.abs(val);
    const nextVal = Math.max(0, Number((parsedAmount + delta).toFixed(2)));
    setAmountStr(nextVal > 0 ? nextVal.toString() : '0');
    setDeltaInput('');
  };

  const handleSetExact = (val: number) => {
    const safeVal = Math.max(0, Number(val.toFixed(2)));
    setAmountStr(safeVal > 0 ? safeVal.toString() : '0');
  };

  // Evaluar expresiones matemáticas en el input principal (ej: 178+53 o 100-27)
  const handleEvaluateExpression = () => {
    const raw = amountStr.replace(/,/g, '.').trim();
    if (!raw) return;

    if (/^[\d.\s+\-*/]+$/.test(raw) && /[+\-*/]/.test(raw.slice(1))) {
      try {
        const sanitized = raw.replace(/[^0-9.+\-*/]/g, '');
        const result = new Function(`return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          const finalVal = Math.max(0, Number(result.toFixed(2)));
          setAmountStr(finalVal > 0 ? finalVal.toString() : '0');
        }
      } catch {
        // En caso de fallo de sintaxis, no modificamos
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleEvaluateExpression();
    setIsSaving(true);
    try {
      const finalAmount = parseFloat(amountStr.replace(',', '.')) || 0;
      await onSave(categoryName, finalAmount);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsSaving(true);
    try {
      await onRemove(categoryName);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  let statusColor = "text-muted-foreground";
  let statusIcon = <CheckCircle2 className="w-4 h-4 text-income" />;
  let statusText = "Equilibrado";

  if (resto < 0) {
    statusColor = "text-destructive";
    statusIcon = <AlertTriangle className="w-4 h-4 text-destructive" />;
    statusText = "Excedido";
  } else if (resto > 0) {
    statusColor = "text-income";
    statusIcon = <CheckCircle2 className="w-4 h-4 text-income" />;
    statusText = "Disponible";
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[92dvh] p-0 overflow-hidden flex flex-col border border-border/60 shadow-2xl rounded-t-3xl sm:rounded-3xl">
        {/* HEADER */}
        <div className="p-5 pb-3 border-b border-border/30 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-black capitalize truncate text-foreground tracking-tight">
                {categoryName}
              </DialogTitle>
              <p className="text-xs font-semibold text-muted-foreground capitalize">
                Periodo: {monthLabel}
              </p>
            </div>
          </div>

          {/* FINANCIAL SUMMARY PILL */}
          <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-background/60 border border-border/40 text-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gastado</span>
              <span className="text-sm font-black text-foreground">{formatCurrency(spent)}</span>
            </div>
            <div className="flex flex-col border-x border-border/40 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resto</span>
              <span className={cn("text-sm font-black", statusColor)}>{formatCurrency(resto)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {statusIcon}
                <span className={cn("text-xs font-bold", statusColor)}>{statusText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* MAIN AMOUNT INPUT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="budget-amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Presupuesto Asignado
              </Label>
              {parsedAmount !== currentAmount && (
                <span className="text-[11px] font-bold text-primary animate-pulse">
                  Modificado
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <Input
                id="budget-amount"
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onBlur={handleEvaluateExpression}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEvaluateExpression();
                  }
                }}
                placeholder="0.00"
                enterKeyHint="done"
                className="h-16 pl-5 pr-12 text-2xl sm:text-3xl font-black bg-background border-border/60 focus-visible:ring-primary/30 rounded-2xl shadow-inner text-foreground"
              />
              <span className="absolute right-4 text-xl font-bold text-muted-foreground select-none pointer-events-none">
                €
              </span>
            </div>
          </div>

          {/* AJUSTE PERSONALIZADO (SUMAR / RESTAR CANTIDADES ESPECÍFICAS) */}
          <div className="space-y-2.5 p-4 bg-muted/20 border border-border/50 rounded-2xl">
            <Label htmlFor="delta-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Ajustar cantidad específica</span>
              <span className="text-[11px] text-muted-foreground/70 lowercase font-medium">ej: 53 o 27</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="delta-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={deltaInput}
                  onChange={(e) => setDeltaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCustomDelta(false);
                    }
                  }}
                  enterKeyHint="done"
                  className="h-12 pl-4 pr-8 text-base font-bold bg-background border-border/60 rounded-xl"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none pointer-events-none">
                  €
                </span>
              </div>
              <Button
                type="button"
                onClick={() => handleApplyCustomDelta(true)}
                disabled={!parseFloat(deltaInput.replace(',', '.'))}
                variant="secondary"
                className="h-12 px-3.5 sm:px-4 rounded-xl font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors border border-destructive/20 gap-1.5"
              >
                <Minus className="w-4 h-4" />
                Restar
              </Button>
              <Button
                type="button"
                onClick={() => handleApplyCustomDelta(false)}
                disabled={!parseFloat(deltaInput.replace(',', '.'))}
                variant="secondary"
                className="h-12 px-3.5 sm:px-4 rounded-xl font-bold bg-income/10 text-income hover:bg-income hover:text-white transition-colors border border-income/20 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Sumar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Escribe cualquier importe y pulsa <strong>Sumar</strong> o <strong>Restar</strong> para sumarlo o restarlo al total.
            </p>
          </div>

          {/* QUICK SHORTCUTS (1-TAP ACTIONS) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Atajos Rápidos
            </span>
            <div className="flex flex-wrap gap-2">
              {/* Cubrir gasto real si está por debajo */}
              {spent > 0 && parsedAmount !== spent && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetExact(spent)}
                  className="rounded-xl text-xs font-bold border-income/30 text-income hover:bg-income/10 gap-1.5 h-9"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Cubrir gasto ({formatCurrency(spent)})
                </Button>
              )}

              {/* Asignar disponible restante */}
              {disponibleParaAsignar > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextVal = Math.max(0, Number((parsedAmount + disponibleParaAsignar).toFixed(2)));
                    setAmountStr(nextVal > 0 ? nextVal.toString() : '0');
                  }}
                  className="rounded-xl text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1.5 h-9"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Todo el disponible ({formatCurrency(disponibleParaAsignar)})
                </Button>
              )}

              {/* Poner a cero */}
              {parsedAmount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetExact(0)}
                  className="rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 h-9"
                >
                  Poner a 0 €
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center gap-3">
          {onRemove && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRemove}
              disabled={isSaving}
              className="h-12 w-12 shrink-0 rounded-2xl border-destructive/30 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
              title="Eliminar este sobre"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-12 rounded-2xl font-bold text-sm"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="flex-1 sm:flex-initial sm:min-w-[160px] h-12 rounded-2xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform gap-2 text-sm"
          >
            <Check className="w-4 h-4 stroke-[3px]" />
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
