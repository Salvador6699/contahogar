import { useState, useMemo, useEffect } from 'react';
import { loadData, updateSavingsGoal, addSavingsGoal, deleteSavingsGoal, updateRecurringRule, updateTransaction } from '@/lib/storage';
import { Account, SavingsGoal, RecurringExpenseRule } from '@/types/finance';
import { calculateAccountBalance, formatCurrency } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PiggyBank, Plus, Target, CalendarDays, ArrowUpCircle, ArrowDownCircle, Info, Edit2, Trash2, Filter, Eye, EyeOff, Calculator } from 'lucide-react';
import SavingsGoalModal from '@/components/SavingsGoalModal';
import { differenceInMonths, parseISO, startOfMonth, addMonths, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export const SavingsPage = () => {
    const [data, setData] = useState(loadData());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
    const [timeframeMonths, setTimeframeMonths] = useState(() => {
        return localStorage.getItem('savingsTimeframe') || '13';
    });

    useEffect(() => {
        localStorage.setItem('savingsTimeframe', timeframeMonths);
    }, [timeframeMonths]);

    const refreshData = () => {
        setData(loadData());
    };

    // 1. Calculate Total Savings Balance (Accounts with excludeFromTotals === true)
    const savingsAccounts = useMemo(() => data.accounts.filter(a => a.excludeFromTotals), [data.accounts]);
    const totalSavingsCapital = useMemo(() => {
        return savingsAccounts.reduce((total, acc) => {
            return total + calculateAccountBalance(acc, data.transactions);
        }, 0);
    }, [savingsAccounts, data.transactions]);

    // 2. Limit date for filtering
    const limitDateStr = useMemo(() => {
        const today = new Date();
        return endOfMonth(addMonths(today, parseInt(timeframeMonths))).toISOString().split('T')[0];
    }, [timeframeMonths]);

    // 3. Gather Manual Goals (Filtered by timeframe)
    const manualGoals = useMemo(() => {
        return (data.savingsGoals || [])
            .filter(g => !g.deadline || g.deadline <= limitDateStr)
            .map(g => ({
                ...g,
                isVirtual: false,
                priority: g.priority || 999,
                isIgnored: !!g.isIgnored
            }));
    }, [data.savingsGoals, limitDateStr]);

    // 4. Gather Virtual Goals from long-term Recurring Rules
    const virtualGoals = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const goals: any[] = [];
        
        (data.recurringRules || [])
            .filter(r => r.frequency === 'yearly' || r.frequency === 'custom' || r.frequency === 'Anual' as any)
            .forEach(r => {
                const txs = data.transactions
                    .filter(t => t.isPending && t.id.startsWith(`rec_${r.id}_`) && t.date >= todayStr && t.date <= limitDateStr)
                    .sort((a,b) => a.date.localeCompare(b.date));
                
                txs.forEach((tx, idx) => {
                    const year = tx.date.split('-')[0];
                    const isYearly = r.frequency === 'yearly' || r.frequency === 'Anual' as any;
                    const suffix = isYearly ? ` (${year})` : (txs.length > 1 ? ` (${idx + 1})` : '');
                    
                    goals.push({
                        id: `virtual_${r.id}_${tx.date}`,
                        name: r.name + suffix,
                        targetAmount: r.amount,
                        currentAmount: 0,
                        deadline: tx.date,
                        category: r.category,
                        priority: r.savingsPriority || 999,
                        isVirtual: true,
                        ruleId: r.id,
                        isIgnored: !!tx.isIgnored,
                        txId: tx.id // Needed to toggle ignore on the specific transaction
                    });
                });
            });
            
        return goals;
    }, [data.recurringRules, data.transactions, limitDateStr]);

    // 5. Combine, Sort, and Distribute Capital
    const unifiedGoals = useMemo(() => {
        const allGoals = [...manualGoals, ...virtualGoals];
        
        // Sort by priority (asc), then by deadline (asc). Ignored goals go to the bottom.
        allGoals.sort((a, b) => {
            if (a.isIgnored && !b.isIgnored) return 1;
            if (!a.isIgnored && b.isIgnored) return -1;
            if (a.priority !== b.priority) return a.priority - b.priority;
            if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
            return 0;
        });

        // Distribute capital
        let remainingCapital = totalSavingsCapital;

        let activePriorityCount = 0;

        return allGoals.map((goal, index) => {
            const needed = goal.targetAmount;
            let allocated = 0;
            
            if (!goal.isIgnored) {
                allocated = Math.min(needed, remainingCapital);
                remainingCapital -= allocated;
                activePriorityCount++;
            }
            
            const missing = needed - allocated;
            let monthsLeft = 1;
            if (goal.deadline) {
                const targetDate = parseISO(goal.deadline);
                const currentDate = new Date();
                const diff = (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + (targetDate.getMonth() - currentDate.getMonth());
                monthsLeft = Math.max(1, diff); // At least 1 month
            }
            
            const suggestedMonthly = missing / monthsLeft;

            return {
                ...goal,
                allocatedAmount: allocated,
                missingAmount: missing,
                monthsLeft,
                suggestedMonthly: goal.isIgnored ? 0 : suggestedMonthly,
                currentIndex: index, // For moving up/down in absolute terms
                displayPriority: goal.isIgnored ? '-' : activePriorityCount
            };
        });
    }, [manualGoals, virtualGoals, totalSavingsCapital]);

    const totalSuggestedMonthly = useMemo(() => {
        return unifiedGoals.reduce((sum, goal) => {
            if (!goal.isIgnored && goal.allocatedAmount < goal.targetAmount) {
                return sum + goal.suggestedMonthly;
            }
            return sum;
        }, 0);
    }, [unifiedGoals]);

    const handleMovePriority = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === unifiedGoals.length - 1) return;

        const currentGoal = unifiedGoals[index];
        const swapGoal = unifiedGoals[direction === 'up' ? index - 1 : index + 1];

        // Swap priorities
        const tempPriority = currentGoal.priority === 999 ? index + 1 : currentGoal.priority;
        const swapTempPriority = swapGoal.priority === 999 ? (direction === 'up' ? index : index + 2) : swapGoal.priority;

        updatePriority(currentGoal, swapTempPriority);
        updatePriority(swapGoal, tempPriority);
        refreshData();
    };

    const updatePriority = (goal: any, newPriority: number) => {
        if (goal.isVirtual) {
            const rule = data.recurringRules?.find(r => r.id === goal.ruleId);
            if (rule) {
                updateRecurringRule({ ...rule, savingsPriority: newPriority });
            }
        } else {
            const manualGoal = data.savingsGoals?.find(g => g.id === goal.id);
            if (manualGoal) {
                updateSavingsGoal({ ...manualGoal, priority: newPriority });
            }
        }
    };

    const handleToggleIgnore = (goal: any) => {
        if (goal.isVirtual) {
            const tx = data.transactions.find(t => t.id === goal.txId);
            if (tx) {
                updateTransaction({ ...tx, isIgnored: !tx.isIgnored });
            }
        } else {
            const manualGoal = data.savingsGoals?.find(g => g.id === goal.id);
            if (manualGoal) {
                updateSavingsGoal({ ...manualGoal, isIgnored: !manualGoal.isIgnored });
            }
        }
        refreshData();
    };

    const handleDeleteManual = (id: string) => {
        deleteSavingsGoal(id);
        toast.success('Meta eliminada');
        refreshData();
    };

    const handleSaveGoal = (goalData: Omit<SavingsGoal, 'id'> | SavingsGoal) => {
        if ('id' in goalData) {
            updateSavingsGoal(goalData as SavingsGoal);
            toast.success('Meta actualizada');
        } else {
            addSavingsGoal({ ...goalData, priority: 999, currentAmount: 0 });
            toast.success('Meta creada');
        }
        refreshData();
    };

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

                {/* Capital Card */}
                <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <PiggyBank className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Capital Total en Ahorros</p>
                                <h2 className="text-4xl font-black text-primary">
                                    {formatCurrency(totalSavingsCapital)}
                                </h2>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                            <Info className="w-4 h-4" />
                            Suma de todas las cuentas marcadas como "Cuenta de Ahorro".
                        </p>
                    </CardContent>
                </Card>

                {/* Total Monthly Suggestion Card */}
                <Card className="border-none shadow-sm bg-gradient-to-br from-secondary/10 to-transparent">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
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
                            <Info className="w-4 h-4" />
                            Suma de las sugerencias mensuales de las metas activas.
                        </p>
                    </CardContent>
                </Card>

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
                                    <SelectItem value="3">Próximos 3 meses</SelectItem>
                                    <SelectItem value="6">Próximos 6 meses</SelectItem>
                                    <SelectItem value="12">Próximos 12 meses</SelectItem>
                                    <SelectItem value="13">Próximos 13 meses</SelectItem>
                                    <SelectItem value="15">Próximos 15 meses</SelectItem>
                                    <SelectItem value="24">Próximos 24 meses</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground -mt-1 mb-4">
                        El sistema llena primero las metas con mayor prioridad (las primeras de la lista) dentro del horizonte seleccionado.
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
                            {unifiedGoals.map((goal, index) => {
                                const isComplete = goal.allocatedAmount >= goal.targetAmount;
                                const progress = Math.min(100, Math.round((goal.allocatedAmount / goal.targetAmount) * 100));

                                return (
                                    <Card key={goal.id} className={`border-none shadow-sm transition-all ${isComplete ? 'opacity-80' : ''} ${goal.isIgnored ? 'opacity-50 grayscale' : ''}`}>
                                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                                            {/* Priority Controls */}
                                            <div className="flex sm:flex-col gap-1 items-center justify-center order-first">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-8 h-8 rounded-full" 
                                                    disabled={index === 0}
                                                    onClick={() => handleMovePriority(index, 'up')}
                                                >
                                                    <ArrowUpCircle className="w-5 h-5 text-muted-foreground" />
                                                </Button>
                                                <span className="text-xs font-bold text-muted-foreground w-4 text-center">{goal.displayPriority}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-8 h-8 rounded-full" 
                                                    disabled={index === unifiedGoals.length - 1}
                                                    onClick={() => handleMovePriority(index, 'down')}
                                                >
                                                    <ArrowDownCircle className="w-5 h-5 text-muted-foreground" />
                                                </Button>
                                            </div>

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
                                                        Para {new Date(goal.deadline).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} 
                                                        ({goal.monthsLeft} meses)
                                                    </p>
                                                )}

                                                {/* Progress Bar */}
                                                <div className="pt-2 pb-1">
                                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                                        <span className={isComplete ? "text-primary" : ""}>
                                                            {formatCurrency(goal.allocatedAmount)} asignado
                                                        </span>
                                                        <span className="text-muted-foreground">de {formatCurrency(goal.targetAmount)}</span>
                                                    </div>
                                                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-primary' : 'bg-blue-500'}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
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
                                                    <div className="bg-primary/10 p-2 sm:p-3 rounded-2xl flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                                            <Target className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <p className="font-bold text-primary text-sm">¡Meta Cubierta!</p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex gap-1 mt-1 sm:mt-0">
                                                    {!isComplete && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleToggleIgnore(goal)}>
                                                            {goal.isIgnored ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    )}
                                                    {!goal.isVirtual && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingGoal(goal as SavingsGoal); setIsModalOpen(true); }}>
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteManual(goal.id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
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
