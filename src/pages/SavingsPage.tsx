import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { SavingsGoal } from '@/types/finance';
import { formatCurrency } from '@/lib/calculations';
import { calculateSavingsProvisions, getSavingsYearOptions, UnifiedSavingsGoal } from '@/lib/savingsCalculations';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { usePlanning } from '@/hooks/usePlanning';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PiggyBank, Plus, Target, CalendarDays, Info, Edit2, Trash2, Filter, Eye, EyeOff, Calculator, Check, X, Wallet } from 'lucide-react';
import SavingsGoalModal from '@/components/SavingsGoalModal';
import { parseISO } from 'date-fns';
import { appToast as toast, swalConfirm } from "@/lib/swal";

export const SavingsPage = () => {
    const navigate = useNavigate();
    const { accounts, isLoading: isAccLoading } = useAccounts();
    const { transactions, updateTransaction: rqUpdateTransaction, isLoading: isTxLoading } = useTransactions();
    const {
        goals,
        savingsTimeframe: timeframeMonths,
        envelopeBalances,
        updateSavingsTimeframe,
        updateEnvelopeBalance,
        addGoal: rqAddGoal,
        updateGoal: rqUpdateGoal,
        deleteGoal: rqDeleteGoal,
        isGoalsLoading
    } = usePlanning();
    const { rules: recurringRules, isLoading: isRulesLoading } = useRecurringRules();
    
    const data = useMemo(() => ({
        accounts,
        transactions,
        savingsGoals: goals,
        recurringRules
    }), [accounts, transactions, goals, recurringRules]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
    const [editingEnvelopeId, setEditingEnvelopeId] = useState<string | null>(null);
    const [envelopeDraft, setEnvelopeDraft] = useState<string>('');
    const setTimeframeMonths = (val: string) => {
        updateSavingsTimeframe(val).catch(console.error);
    };

    const {
        totalSavingsCapital,
        unifiedGoals,
        totalSuggestedMonthly,
        envelopesSummary,
    } = useMemo(() => {
        return calculateSavingsProvisions(
            data.accounts,
            data.transactions,
            data.savingsGoals || [],
            data.recurringRules || [],
            timeframeMonths,
            {
                useEnvelopeBalances: true,
                envelopeBalances,
            }
        );
    }, [data.accounts, data.transactions, data.savingsGoals, data.recurringRules, timeframeMonths, envelopeBalances]);

    const handleToggleIgnore = async (goal: UnifiedSavingsGoal) => {
        if (goal.isVirtual) {
            const tx = data.transactions.find(t => t.id === goal.txId);
            if (tx) {
                await rqUpdateTransaction({ ...tx, isIgnored: !tx.isIgnored });
            }
        } else {
            const manualGoal = data.savingsGoals?.find(g => g.id === goal.id);
            if (manualGoal) {
                await rqUpdateGoal({ ...manualGoal, isIgnored: !manualGoal.isIgnored });
            }
        }
    };

    const handleDeleteManual = async (id: string) => {
        const confirmed = await swalConfirm(
            '¿Eliminar meta de ahorro?',
            'Esta acción eliminará la meta de tu lista de provisiones.',
            'Sí, eliminar'
        );
        if (!confirmed) return;
        await rqDeleteGoal(id);
        toast.success('Meta eliminada');
    };

    const handleSaveGoal = async (goalData: Omit<SavingsGoal, 'id'> | SavingsGoal) => {
        if ('id' in goalData) {
            await rqUpdateGoal(goalData as SavingsGoal);
            toast.success('Meta actualizada');
        } else {
            await rqAddGoal({ ...goalData, currentAmount: goalData.currentAmount ?? 0 });
            toast.success('Meta creada');
        }
    };

    const unplacedCapital = envelopesSummary.unassignedSavingsCapital;
    const availableToPlace = Math.max(0, unplacedCapital);

    const handleSetEnvelopeBalance = async (goal: UnifiedSavingsGoal, nextAmount: number) => {
        const maxAllowed = Math.max(goal.allocatedAmount, Number((goal.allocatedAmount + unplacedCapital).toFixed(2)));
        const requested = Math.max(0, Number((Number(nextAmount) || 0).toFixed(2)));
        if (requested > maxAllowed + 0.005) {
            toast.warning(`Solo te quedan ${formatCurrency(availableToPlace)} sin colocar en ahorros.`);
        }
        const clamped = Math.min(maxAllowed, requested);
        try {
            if (goal.isVirtual) {
                await updateEnvelopeBalance(goal.id, clamped);
            } else {
                const manualGoal = data.savingsGoals?.find(g => g.id === goal.id);
                if (manualGoal) {
                    await rqUpdateGoal({ ...manualGoal, currentAmount: clamped });
                }
            }
        } catch (error) {
            console.error('Error updating envelope balance:', error);
            toast.error('No se pudo actualizar el importe colocado');
        }
    };

    if (isAccLoading || isTxLoading || isGoalsLoading || isRulesLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
    }

    return (
        <div className="w-full pb-24">
            <div className="w-full max-w-5xl mx-auto px-4 lg:px-12 py-4 sm:py-6 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3">
                            <PiggyBank className="w-8 h-8 text-primary" />
                            Ahorros y Provisiones
                        </h1>
                        <p className="text-muted-foreground mt-1 font-medium">
                            Gestiona tu capital destinado a metas y gastos futuros.
                        </p>
                    </div>
                    <Button onClick={() => { setEditingGoal(null); setIsModalOpen(true); }} className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                            <Plus className="w-5 h-5 mr-2" />
                            Nueva Meta
                        </Button>
                </div>

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Capital in Savings Card */}
                    <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <PiggyBank className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total en Ahorros</p>
                                    <h2 className="text-4xl font-black text-primary">
                                        {formatCurrency(totalSavingsCapital)}
                                    </h2>
                                </div>
                            </div>

                            {/* Placed vs Unplaced */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-background/60 border border-border/50 p-3">
                                    <p className="text-[11px] font-bold uppercase text-muted-foreground">Ya colocado</p>
                                    <p className="text-xl font-black text-foreground mt-0.5">
                                        {formatCurrency(envelopesSummary.totalInEnvelopes)}
                                    </p>
                                </div>
                                <div className={`rounded-2xl border p-3 ${unplacedCapital < 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-emerald-500/10 border-emerald-500/25'}`}>
                                    <p className="text-[11px] font-bold uppercase text-muted-foreground">Sin colocar</p>
                                    <p className={`text-xl font-black mt-0.5 ${unplacedCapital < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {formatCurrency(unplacedCapital)}
                                    </p>
                                </div>
                            </div>

                            {unplacedCapital < 0 && (
                                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                    Has colocado {formatCurrency(Math.abs(unplacedCapital))} más de lo que tienes en ahorros. Reduce algún importe abajo.
                                </p>
                            )}

                            {/* Stacked breakdown bar over totalSavingsCapital */}
                            {totalSavingsCapital > 0 && (
                                <div className="space-y-2">
                                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                                        {envelopesSummary.provisionsAllocated > 0 && (
                                            <div
                                                className="h-full bg-blue-500 transition-all"
                                                style={{ width: `${Math.min(100, (envelopesSummary.provisionsAllocated / totalSavingsCapital) * 100)}%` }}
                                            />
                                        )}
                                        {envelopesSummary.manualGoalsAllocated > 0 && (
                                            <div
                                                className="h-full bg-violet-500 transition-all"
                                                style={{ width: `${Math.min(100, (envelopesSummary.manualGoalsAllocated / totalSavingsCapital) * 100)}%` }}
                                            />
                                        )}
                                        {envelopesSummary.placedOutsideFilter > 0 && (
                                            <div
                                                className="h-full bg-amber-500 transition-all"
                                                style={{ width: `${Math.min(100, (envelopesSummary.placedOutsideFilter / totalSavingsCapital) * 100)}%` }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                            Previstos: <strong className="text-foreground">{formatCurrency(envelopesSummary.provisionsAllocated)}</strong>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                            Metas: <strong className="text-foreground">{formatCurrency(envelopesSummary.manualGoalsAllocated)}</strong>
                                        </span>
                                        {envelopesSummary.placedOutsideFilter > 0 && (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                                Años posteriores: <strong className="text-foreground">{formatCurrency(envelopesSummary.placedOutsideFilter)}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Total Monthly Suggestion Card */}
                    <Card className="border-none shadow-sm bg-gradient-to-br from-secondary/10 to-transparent">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                                    <Calculator className="w-6 h-6 text-secondary-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total a apartar este mes</p>
                                    <h2 className="text-4xl font-black text-secondary-foreground">
                                        {formatCurrency(totalSuggestedMonthly)}
                                    </h2>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                                <Info className="w-4 h-4 shrink-0" />
                                {timeframeMonths === 'none'
                                    ? 'Modo "Sin provisión" activo: tus previstos y metas siguen visibles, pero este mes se reservan 0 €.'
                                    : 'Suma mensual recomendada para cubrir los pagos y metas pendientes antes de su fecha.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* List of Goals */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Distribución de Metas
                        </h3>
                        
                        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/50 w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
                            <Select value={timeframeMonths} onValueChange={setTimeframeMonths}>
                                <SelectTrigger className="h-9 border-none bg-transparent font-bold focus:ring-0">
                                    <SelectValue placeholder="Horizonte" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin provisión (0 €)</SelectItem>
                                    {getSavingsYearOptions().map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground -mt-1 mb-4">
                        Cada sobre guarda su propio saldo en efectivo. La sugerencia mensual se calcula según lo que falta para llegar a la fecha de cada pago o meta.
                    </p>

                    {unifiedGoals.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed border-border/50">
                            <Target className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-lg font-bold text-muted-foreground">No tienes metas de ahorro ni gastos anuales.</p>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                                Crea una nueva meta o añade gastos recurrentes anuales para ver cómo el sistema calcula lo que debes apartar.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {unifiedGoals.map((goal) => {
                                const isComplete = goal.allocatedAmount >= goal.targetAmount;
                                const progress = goal.targetAmount > 0
                                    ? Math.min(100, Math.round((goal.allocatedAmount / goal.targetAmount) * 100))
                                    : 100;
                                const isHalfOrMore = !isComplete && progress >= 50;
                                const barColorClass = isComplete
                                    ? 'bg-emerald-500'
                                    : isHalfOrMore
                                        ? 'bg-amber-500'
                                        : 'bg-red-500';
                                const statusTextClass = isComplete
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isHalfOrMore
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-red-600 dark:text-red-400';

                                return (
                                    <Card key={goal.id} className={`border-none shadow-sm transition-all ${isComplete ? 'opacity-85' : ''} ${goal.isIgnored ? 'opacity-50 grayscale' : ''}`}>
                                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                                            {/* Info */}
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-lg">{goal.name}</h4>
                                                    {goal.isVirtual && (
                                                        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full uppercase font-bold">Gasto Recurrente</span>
                                                    )}
                                                </div>
                                                {goal.deadline && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                        Para {parseISO(goal.deadline).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} 
                                                        ({goal.monthsLeft} meses)
                                                    </p>
                                                )}

                                                {/* Progress Bar */}
                                                <div className="pt-2 pb-1">
                                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                                        <span className={statusTextClass}>
                                                            {formatCurrency(goal.allocatedAmount)} en sobre ({progress}%)
                                                        </span>
                                                        <span className="text-muted-foreground">de {formatCurrency(goal.targetAmount)}</span>
                                                    </div>
                                                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Quick Envelope Cash Controls */}
                                                {!goal.isIgnored && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                                        {editingEnvelopeId === goal.id ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    autoFocus
                                                                    value={envelopeDraft}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => setEnvelopeDraft(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleSetEnvelopeBalance(goal, parseFloat(envelopeDraft) || 0);
                                                                            setEditingEnvelopeId(null);
                                                                        } else if (e.key === 'Escape') {
                                                                            setEditingEnvelopeId(null);
                                                                        }
                                                                    }}
                                                                    className="h-7 w-28 text-xs font-bold"
                                                                    placeholder="0"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 px-2"
                                                                    onClick={() => {
                                                                        handleSetEnvelopeBalance(goal, parseFloat(envelopeDraft) || 0);
                                                                        setEditingEnvelopeId(null);
                                                                    }}
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-1.5"
                                                                    onClick={() => setEditingEnvelopeId(null)}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 rounded-lg text-[11px] font-bold"
                                                                    onClick={() => handleSetEnvelopeBalance(goal, goal.allocatedAmount - 10)}
                                                                    disabled={goal.allocatedAmount <= 0}
                                                                >
                                                                    -10 €
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 rounded-lg text-[11px] font-bold"
                                                                    onClick={() => handleSetEnvelopeBalance(goal, goal.allocatedAmount + 10)}
                                                                    disabled={availableToPlace < 10}
                                                                >
                                                                    +10 €
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 rounded-lg text-[11px] font-bold"
                                                                    onClick={() => handleSetEnvelopeBalance(goal, goal.allocatedAmount + 50)}
                                                                    disabled={availableToPlace < 50}
                                                                >
                                                                    +50 €
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                                                    onClick={() =>
                                                                        handleSetEnvelopeBalance(
                                                                            goal,
                                                                            Math.min(
                                                                                goal.targetAmount,
                                                                                goal.allocatedAmount + availableToPlace
                                                                            )
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        goal.missingAmount <= 0 ||
                                                                        availableToPlace <= 0
                                                                    }
                                                                >
                                                                    Llenar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-destructive"
                                                                    onClick={() => handleSetEnvelopeBalance(goal, 0)}
                                                                    disabled={goal.allocatedAmount <= 0}
                                                                >
                                                                    Vaciar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-2 rounded-lg text-[11px] font-bold text-muted-foreground"
                                                                    onClick={() => {
                                                                        setEnvelopeDraft(
                                                                            goal.allocatedAmount === 0
                                                                                ? ''
                                                                                : String(goal.allocatedAmount)
                                                                        );
                                                                        setEditingEnvelopeId(goal.id);
                                                                    }}
                                                                >
                                                                    <Wallet className="w-3 h-3 mr-1" />
                                                                    Editar saldo
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action / Suggestion */}
                                            <div className="sm:text-right flex flex-row sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                                                {!isComplete ? (
                                                    <div className="bg-muted/50 p-2 sm:p-3 rounded-2xl">
                                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Sugerencia mensual</p>
                                                        <p className="text-lg font-black text-foreground">
                                                            {formatCurrency(goal.suggestedMonthly)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-500/10 p-2 sm:p-3 rounded-2xl flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                                            <Target className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">¡Cubierta!</p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex gap-1 mt-1 sm:mt-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            title={goal.isIgnored ? 'Incluir meta en el reparto' : 'Ignorar meta'}
                                                            onClick={() => handleToggleIgnore(goal)}
                                                        >
                                                            {goal.isIgnored ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </Button>
                                                        {!goal.isVirtual ? (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => {
                                                                        const originalGoal = data.savingsGoals?.find(g => g.id === goal.id) ?? null;
                                                                        setEditingGoal(originalGoal);
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                    title="Editar meta"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteManual(goal.id)} title="Eliminar meta">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary" 
                                                                title="Editar gasto fijo y sus opciones de provisión"
                                                                onClick={() => {
                                                                    navigate({
                                                                        to: '/gastos-fijos',
                                                                        search: { editRuleId: goal.ruleId },
                                                                    } as any);
                                                                }}
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <SavingsGoalModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveGoal}
                editingGoal={editingGoal}
                accounts={data.accounts}
            />
        </div>
    );
};

export default SavingsPage;
