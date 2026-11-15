import { useState, useEffect } from 'react';
import { Banknote, Check, Edit2, Home, User, Users, AlertTriangle, X } from 'lucide-react';
import { CashBreakdown } from '@/api/local/planning';
import { usePlanning } from '@/hooks/usePlanning';
import { formatCurrency } from '@/lib/calculations';
import { parseAmount, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { appToast as toast } from '@/lib/swal';

interface CashBreakdownBarProps {
  cashAccountBalance: number;
  isCashSelected?: boolean;
  compact?: boolean;
}

export const CashBreakdownBar = ({
  cashAccountBalance,
  isCashSelected = false,
  compact = false,
}: CashBreakdownBarProps) => {
  const { cashBreakdown, updateCashBreakdown } = usePlanning();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [mineInput, setMineInput] = useState(cashBreakdown.mine.toString());
  const [yasminaInput, setYasminaInput] = useState(cashBreakdown.yasmina.toString());
  const [homeInput, setHomeInput] = useState(cashBreakdown.home.toString());

  useEffect(() => {
    if (!isEditing) {
      setMineInput(cashBreakdown.mine.toFixed(2));
      setYasminaInput(cashBreakdown.yasmina.toFixed(2));
      setHomeInput(cashBreakdown.home.toFixed(2));
    }
  }, [cashBreakdown, isEditing]);

  const sumPockets = Number(
    (cashBreakdown.mine + cashBreakdown.yasmina + cashBreakdown.home).toFixed(2)
  );
  const diff = Number((cashAccountBalance - sumPockets).toFixed(2));
  const isMatched = Math.abs(diff) < 0.005;

  const openEditor = () => {
    setMineInput(cashBreakdown.mine.toFixed(2));
    setYasminaInput(cashBreakdown.yasmina.toFixed(2));
    setHomeInput(cashBreakdown.home.toFixed(2));
    setIsEditing(true);
  };

  const handleSave = async () => {
    const mine = parseAmount(mineInput || '0');
    const yasmina = parseAmount(yasminaInput || '0');
    const home = parseAmount(homeInput || '0');

    if (
      isNaN(mine) ||
      isNaN(yasmina) ||
      isNaN(home) ||
      mine < 0 ||
      yasmina < 0 ||
      home < 0
    ) {
      toast.error('Introduce importes válidos iguales o mayores que 0.');
      return;
    }

    setIsSaving(true);
    try {
      await updateCashBreakdown({ mine, yasmina, home });
      setIsEditing(false);
      toast.success('Reparto de efectivo actualizado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickReconcile = async (target: keyof CashBreakdown) => {
    const candidate = Number((cashBreakdown[target] + diff).toFixed(2));
    if (candidate < 0) return;

    const next: CashBreakdown = {
      ...cashBreakdown,
      [target]: candidate,
    };
    setIsSaving(true);
    try {
      await updateCashBreakdown(next);
      toast.success(`Efectivo cuadrado (${formatCurrency(cashAccountBalance)}).`);
    } finally {
      setIsSaving(false);
    }
  };

  const canFixMine = !isMatched && cashBreakdown.mine + diff >= -0.001;
  const canFixYasmina = !isMatched && cashBreakdown.yasmina + diff >= -0.001;
  const canFixHome = !isMatched && cashBreakdown.home + diff >= -0.001;

  const pockets = [
    { key: 'mine' as const, label: 'Mi cartera', value: cashBreakdown.mine, Icon: User },
    { key: 'yasmina' as const, label: 'Yasmina', value: cashBreakdown.yasmina, Icon: Users },
    { key: 'home' as const, label: 'En casa', value: cashBreakdown.home, Icon: Home },
  ];

  const liveSum = (() => {
    const m = parseAmount(mineInput || '0');
    const y = parseAmount(yasminaInput || '0');
    const h = parseAmount(homeInput || '0');
    if (isNaN(m) || isNaN(y) || isNaN(h)) return sumPockets;
    return Number((m + y + h).toFixed(2));
  })();
  const liveDiff = Number((cashAccountBalance - liveSum).toFixed(2));

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-card p-3.5 sm:p-4 shadow-sm space-y-3 tabular-nums">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Dónde está tu efectivo ({formatCurrency(cashAccountBalance)})
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setIsEditing(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Mi cartera (€)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={mineInput}
              onChange={(e) => setMineInput(e.target.value)}
              className="h-9 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Cartera Yasmina (€)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={yasminaInput}
              onChange={(e) => setYasminaInput(e.target.value)}
              className="h-9 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Home className="w-3 h-3" /> En casa (€)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={homeInput}
              onChange={(e) => setHomeInput(e.target.value)}
              className="h-9 text-sm bg-background"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">
              Suma: <strong className="text-foreground">{formatCurrency(liveSum)}</strong>
            </span>
            {Math.abs(liveDiff) < 0.005 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[11px] font-bold">
                <Check className="w-3 h-3" /> Cuadrado con Efectivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[11px] font-bold">
                <AlertTriangle className="w-3 h-3" />
                {liveDiff > 0
                  ? `Faltan ${formatCurrency(liveDiff)} por asignar`
                  : `Sobran ${formatCurrency(Math.abs(liveDiff))} respecto a Efectivo`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all tabular-nums',
        isCashSelected
          ? 'border-emerald-500/35 bg-emerald-500/[0.06] p-3 sm:p-3.5 shadow-xs'
          : 'border-border/50 bg-card/70 px-3 py-2'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 shrink-0">
            <Banknote className="w-3.5 h-3.5" />
            <span>{compact ? 'Efectivo:' : 'Ubicación efectivo:'}</span>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            {pockets.map(({ key, label, value, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={openEditor}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background/85 hover:bg-background border border-border/60 text-xs transition-colors cursor-pointer"
                title="Pulsa para ajustar el reparto de efectivo"
              >
                <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground font-medium">{label}:</span>
                <strong className="text-foreground font-bold">{formatCurrency(value)}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto shrink-0">
          {isMatched ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Check className="w-3 h-3" /> Cuadrado ({formatCurrency(cashAccountBalance)})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="w-3 h-3" />
              Descuadre: {formatCurrency(sumPockets)} vs {formatCurrency(cashAccountBalance)}
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openEditor}
            className="h-7 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <Edit2 className="w-3 h-3" />
            <span>Editar</span>
          </Button>
        </div>
      </div>

      {!isMatched && (isCashSelected || Math.abs(diff) >= 0.01) && (
        <div className="mt-2 pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-amber-800 dark:text-amber-300 font-semibold mr-1">
            {diff > 0
              ? `Faltan ${formatCurrency(diff)} por repartir:`
              : `Sobran ${formatCurrency(Math.abs(diff))} en el reparto respecto a Efectivo:`}
          </span>
          {canFixMine && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleQuickReconcile('mine')}
              className="px-2 py-0.5 rounded-lg font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
            >
              Cuadrar Mi cartera ({formatCurrency(Math.max(0, cashBreakdown.mine + diff))})
            </button>
          )}
          {canFixYasmina && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleQuickReconcile('yasmina')}
              className="px-2 py-0.5 rounded-lg font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
            >
              Cuadrar Yasmina ({formatCurrency(Math.max(0, cashBreakdown.yasmina + diff))})
            </button>
          )}
          {canFixHome && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleQuickReconcile('home')}
              className="px-2 py-0.5 rounded-lg font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
            >
              Cuadrar En casa ({formatCurrency(Math.max(0, cashBreakdown.home + diff))})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
