import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from '@/hooks/useSearchParams';
import { Budget } from '@/types/finance';
import { formatCurrency, calculateTotalBalance, calculatePendingImpact } from '@/lib/calculations';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PiggyBank, PlusCircle, Trash2, Search, X, ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react';
import { appToast as toast } from "@/lib/swal";
import { cn, parseAmount } from '@/lib/utils';
import Swal from 'sweetalert2';
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
import { useMonthFilter } from "@/hooks/useMonthFilter";

import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { usePlanning } from '@/hooks/usePlanning';
import { useTeam } from '@/contexts/TeamContext';
import { BudgetAssignmentModal } from '@/components/BudgetAssignmentModal';

const BudgetPage = () => {
    const { activeRole } = useTeam();
    const { accounts, isLoading: isAccLoading } = useAccounts();
    const { transactions, isLoading: isTxLoading } = useTransactions();
    const { categories, isLoading: isCatLoading } = useCategories();
    const { budgets, saveBudgets, isBudgetsLoading: isBudLoading } = usePlanning();

    const data = useMemo(() => ({
        accounts,
        transactions,
        categories,
        budgets,
    }), [accounts, transactions, categories, budgets]);

    const [searchParams] = useSearchParams();
    const [selectedMonth, setSelectedMonth] = useState<string | null>(searchParams.get("month"));
    
    const {
      isCurrentMonth,
      selectedMonthLabel,
      currentMonthKey,
    } = useMonthFilter(data.transactions, selectedMonth);

    const activeMonth = selectedMonth || currentMonthKey;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryAmount, setNewCategoryAmount] = useState('');
    
    // Category currently open in the BudgetAssignmentModal
    const [editingCategory, setEditingCategory] = useState<string | null>(null);

    // Local state of assignments for the active month
    const [localAssignments, setLocalAssignments] = useState<Record<string, { amount: number, isAuto: boolean }>>({});
    
    // Search query for categories
    const [searchQuery, setSearchQuery] = useState(searchParams.get('category') || '');

    // Sync local assignments when data or active month changes
    useEffect(() => {
        const assignments: Record<string, { amount: number, isAuto: boolean }> = {};
        const monthBudgets = data.budgets.filter(b => b.month === activeMonth && b.category !== 'Transferencia');
        monthBudgets.forEach(b => {
            assignments[b.category] = { amount: b.amount, isAuto: !!b.isAuto };
        });
        setLocalAssignments(assignments);
    }, [data, activeMonth]);

    // Save assignments directly to Supabase
    const saveAssignmentsToDb = async (assignments: Record<string, { amount: number, isAuto: boolean }>) => {
        const newBudgets: Budget[] = [];
        Object.entries(assignments).forEach(([category, { amount }]) => {
            if (amount > 0) {
                newBudgets.push({
                    id: crypto.randomUUID(),
                    category,
                    amount,
                    month: activeMonth,
                    isAuto: false,
                    createdAt: new Date().toISOString()
                });
            }
        });
        await saveBudgets({ month: activeMonth, budgets: newBudgets });
    };

    // Callback when saving a category budget from the Bottom Sheet
    const handleSaveCategoryBudget = async (categoryName: string, amount: number) => {
        const next = {
            ...localAssignments,
            [categoryName]: { amount, isAuto: false }
        };
        setLocalAssignments(next);
        await saveAssignmentsToDb(next);
        toast.success(`Presupuesto de ${categoryName} guardado`);
    };

    // Callback when removing a category budget from the Bottom Sheet
    const handleRemoveCategoryBudget = async (categoryName: string) => {
        const next = { ...localAssignments };
        delete next[categoryName];
        setLocalAssignments(next);
        await saveAssignmentsToDb(next);
        toast.success(`Sobre ${categoryName} eliminado`);
    };

    const handleAutoAssignFutureExpenses = async (silent = false) => {
        const monthExpenses = data.transactions.filter(t => 
            t.type === 'expense' && 
            t.date.startsWith(activeMonth) &&
            t.category !== 'Transferencia' &&
            !t.isIgnored
        );

        const next = { ...localAssignments };
        // Limpiar sobres automáticos anteriores
        Object.keys(next).forEach(cat => {
            if (next[cat].isAuto) {
                delete next[cat];
            }
        });

        const spentByCategory: Record<string, number> = {};
        monthExpenses.forEach(t => {
            spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
        });

        let assignedCount = 0;
        Object.entries(spentByCategory).forEach(([category, amount]) => {
            if (!next[category]) {
                next[category] = { amount, isAuto: true };
                assignedCount++;
            }
        });

        if (assignedCount > 0) {
            setLocalAssignments(next);
            if (!silent) {
                await saveAssignmentsToDb(next);
                toast.success(`${assignedCount} gastos futuros autoasignados`);
            }
        } else if (!silent) {
            toast.info("No hay nuevos gastos futuros para autoasignar");
        }
    };

    // Auto-asignar silenciosamente al cambiar de mes o transacciones
    useEffect(() => {
        handleAutoAssignFutureExpenses(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMonth, data.transactions]);

    const handleClearAll = async () => {
        const result = await Swal.fire({
            title: '¿Limpiar presupuestos?',
            text: '¿Estás seguro de que quieres limpiar todos los presupuestos de este mes?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'hsl(var(--primary))',
            cancelButtonColor: 'hsl(var(--destructive))',
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar',
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))'
        });

        if (result.isConfirmed) {
            setLocalAssignments({});
            await saveAssignmentsToDb({});
            toast.success('Todos los presupuestos del mes han sido limpiados');
        }
    };

    const handleCopyPreviousMonth = async () => {
        const current = parseISO(activeMonth + "-01");
        const prevMonthStr = format(subMonths(current, 1), "yyyy-MM");
        
        const prevMonthBudgets = data.budgets.filter(b => b.month === prevMonthStr && b.category !== 'Transferencia');
        
        const next = { ...localAssignments };
        let copiedCount = 0;
        
        prevMonthBudgets.forEach(b => {
            if (!b.isAuto) {
                const currentAmount = next[b.category]?.amount || 0;
                if (currentAmount === 0) {
                    next[b.category] = { amount: b.amount, isAuto: false };
                    copiedCount++;
                }
            }
        });
        
        if (copiedCount > 0) {
            setLocalAssignments(next);
            await saveAssignmentsToDb(next);
            toast.success(`${copiedCount} presupuestos copiados del mes anterior`);
        } else {
            toast.info('No hay presupuestos manuales nuevos que copiar');
        }
    };

    const handleConfirmAddCategory = async () => {
        if (!newCategoryName) {
            toast.error("Por favor, selecciona una categoría.");
            return;
        }
        
        const numValue = newCategoryAmount === '' ? 0 : parseAmount(newCategoryAmount);
        if (isNaN(numValue)) {
            toast.error("El importe no es válido.");
            return;
        }

        const next = {
            ...localAssignments,
            [newCategoryName]: { amount: numValue, isAuto: false }
        };
        setLocalAssignments(next);
        await saveAssignmentsToDb(next);
        
        setIsAddModalOpen(false);
        setNewCategoryName('');
        setNewCategoryAmount('');
        toast.success(`Sobre ${newCategoryName} añadido`);
    };

    const incomeOnlyCategories = useMemo(() => {
        const incomeCats = new Set<string>();
        const expenseCats = new Set<string>();
        data.transactions.forEach(t => {
            if (t.type === 'income') incomeCats.add(t.category);
            if (t.type === 'expense') expenseCats.add(t.category);
        });
        if (!expenseCats.has('Sueldo')) incomeCats.add('Sueldo');
        if (!expenseCats.has('Nómina')) incomeCats.add('Nómina');
        
        return new Set([...incomeCats].filter(c => !expenseCats.has(c)));
    }, [data.transactions]);

    const availableCategoriesToAdd = data.categories.filter(c => 
        (localAssignments[c.name] === undefined || localAssignments[c.name].isAuto) && 
        c.name !== 'Transferencia' &&
        !incomeOnlyCategories.has(c.name)
    );

    const capitalDisponible = useMemo(() => {
        const balanceActual = calculateTotalBalance(data.accounts, data.transactions, false, activeMonth);
        let pendingImpact = 0;
        data.accounts.forEach(acc => {
            if (!acc.excludeFromTotals) {
                pendingImpact += calculatePendingImpact(data.transactions, activeMonth, acc.id);
            }
        });
        return Number((balanceActual + pendingImpact).toFixed(2));
    }, [data, activeMonth]);

    const ingresosDelMes = useMemo(() => {
        return Number(data.transactions
            .filter(t => t.type === 'income' && t.category !== 'Transferencia' && t.date.startsWith(activeMonth) && !t.isIgnored)
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
    }, [data.transactions, activeMonth]);

    const getGastado = (catName: string) => {
        return Number(data.transactions
            .filter(t => !t.isPending && t.type === 'expense' && t.category === catName && t.date.startsWith(activeMonth))
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
    };

    const getRestoForSort = (catName: string) => {
        const savedBudget = data.budgets.find(b => b.month === activeMonth && b.category === catName);
        const amount = savedBudget ? savedBudget.amount : 0;
        const gastado = getGastado(catName);
        return amount - gastado;
    };

    const sortBudgets = (a: string, b: string) => {
        const restoA = getRestoForSort(a);
        const restoB = getRestoForSort(b);

        const groupA = restoA < 0 ? 0 : restoA > 0 ? 1 : 2;
        const groupB = restoB < 0 ? 0 : restoB > 0 ? 1 : 2;

        if (groupA !== groupB) {
            return groupA - groupB;
        }

        if (groupA === 0) {
            return restoA - restoB; 
        }
        
        if (groupA === 1) {
            return restoB - restoA;
        }

        return a.localeCompare(b);
    };

    const getSortPercentage = (cat: string) => {
        const amount = Number((localAssignments[cat]?.amount || 0).toFixed(2));
        const gastado = Number(getGastado(cat).toFixed(2));
        const resto = Number((amount - gastado).toFixed(2));
        
        if (amount === 0 && gastado === 0) return 0;
        if (resto === 0 && amount > 0) return 100;
        if (resto < 0) return 200;
        
        return amount > 0 ? (gastado / amount) * 100 : 0;
    };

    const allCategories = Object.keys(localAssignments);
    const sinSobre = allCategories.filter(cat => localAssignments[cat].isAuto).sort(sortBudgets);
    const manuales = allCategories.filter(cat => !localAssignments[cat].isAuto);
    
    const saludables = manuales.filter(cat => getSortPercentage(cat) < 80).sort(sortBudgets);
    const vacios = manuales.filter(cat => getSortPercentage(cat) === 100).sort(sortBudgets);
    const enPeligro = manuales.filter(cat => {
        const perc = getSortPercentage(cat);
        return perc >= 80 && perc !== 100;
    }).sort(sortBudgets);

    const nextMonthStr = useMemo(() => format(addMonths(parseISO(activeMonth + "-01"), 1), "yyyy-MM"), [activeMonth]);

    const nextMonthBudgetsTotal = useMemo(() => {
        const nextMonthExpenses = data.transactions.filter(t => 
            t.type === 'expense' && 
            t.date.startsWith(nextMonthStr) &&
            t.category !== 'Transferencia' &&
            !t.isIgnored
        );

        const sum = nextMonthExpenses.reduce((acc, t) => acc + t.amount, 0);
        return Number(sum.toFixed(2));
    }, [data.transactions, nextMonthStr]);

    const sumManualBudgets = Number(manuales.reduce((sum, cat) => sum + localAssignments[cat].amount, 0).toFixed(2));
    const sumAutoBudgets = Number(sinSobre.reduce((sum, cat) => sum + localAssignments[cat].amount, 0).toFixed(2));
    
    const disponibleParaAsignar = useMemo(() => {
        const realBalance = calculateTotalBalance(data.accounts, data.transactions, false, currentMonthKey);
        let currentMonthPendingImpact = 0;
        data.accounts.forEach(acc => {
            if (!acc.excludeFromTotals) {
                currentMonthPendingImpact += calculatePendingImpact(data.transactions, currentMonthKey, acc.id);
            }
        });
        const baseCapital = realBalance + currentMonthPendingImpact;
        const baseGastos = Number(data.transactions
            .filter(t => t.type === 'expense' && t.category !== 'Transferencia' && t.date.startsWith(currentMonthKey) && !t.isIgnored)
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
        const baseBudgets = currentMonthKey === activeMonth
            ? sumManualBudgets + sumAutoBudgets
            : Number(data.budgets
                .filter(b => b.month === currentMonthKey && b.category !== 'Transferencia')
                .reduce((sum, b) => sum + b.amount, 0).toFixed(2));
        
        let noAsignada = baseCapital + baseGastos - baseBudgets;

        let m = addMonths(parseISO(currentMonthKey + "-01"), 1);
        const end = parseISO(activeMonth + "-01");

        while (m <= end) {
            const mStr = format(m, 'yyyy-MM');
            const monthIngresos = Number(data.transactions
                .filter(t => t.type === 'income' && t.category !== 'Transferencia' && t.date.startsWith(mStr) && !t.isIgnored)
                .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
            
            let monthBudgets = 0;
            if (mStr === activeMonth) {
                monthBudgets = sumManualBudgets + sumAutoBudgets;
            } else {
                monthBudgets = Number(data.budgets
                    .filter(b => b.month === mStr && b.category !== 'Transferencia')
                    .reduce((sum, b) => sum + b.amount, 0).toFixed(2));
            }

            noAsignada = noAsignada + monthIngresos - monthBudgets;
            m = addMonths(m, 1);
        }

        noAsignada -= nextMonthBudgetsTotal;

        return Number(noAsignada.toFixed(2));
    }, [activeMonth, currentMonthKey, sumManualBudgets, sumAutoBudgets, data, nextMonthBudgetsTotal]);

    const filteredEnPeligro = enPeligro.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredSaludables = saludables.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredVacios = vacios.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredSinSobre = sinSobre.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));

    const handlePrevMonth = () => {
        const current = parseISO(activeMonth + "-01");
        const prevMonth = subMonths(current, 1);
        setSelectedMonth(format(prevMonth, "yyyy-MM"));
    };

    const handleNextMonth = () => {
        const current = parseISO(activeMonth + "-01");
        const nextMonth = addMonths(current, 1);
        setSelectedMonth(format(nextMonth, "yyyy-MM"));
    };

    const handleBackToCurrentMonth = () => {
        setSelectedMonth(null);
    };

    if (isAccLoading || isTxLoading || isCatLoading || isBudLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
    }

    const renderRow = (cat: string, type: 'peligro' | 'saludable' | 'sin_sobre' | 'vacio') => {
        const amount = Number((localAssignments[cat].amount || 0).toFixed(2));
        const gastado = Number(getGastado(cat).toFixed(2));
        const resto = Number((amount - gastado).toFixed(2));
        const percentage = amount > 0 ? (gastado / amount) * 100 : gastado > 0 ? 100 : 0;
        
        let colorClass = "bg-muted-foreground";
        if (type === 'peligro') colorClass = "bg-destructive";
        else if (type === 'saludable') colorClass = "bg-income";
        else if (type === 'vacio') colorClass = "bg-muted-foreground/60";

        return (
            <div 
                key={cat} 
                id={`row-${cat}`} 
                onClick={() => activeRole === 'admin' && setEditingCategory(cat)}
                className={cn(
                    "bg-card rounded-2xl sm:rounded-3xl border border-border/50 shadow-sm p-4 transition-all duration-200 select-none group",
                    activeRole === 'admin' ? "cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.99]" : ""
                )}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <h3 className="font-bold text-base capitalize truncate text-foreground/90 group-hover:text-primary transition-colors">
                            {cat}
                        </h3>
                        {localAssignments[cat]?.isAuto && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40 shrink-0">
                                Sin sobre
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("font-black text-lg", resto > 0 ? "text-income" : resto < 0 ? "text-destructive" : "text-foreground")}>
                            {formatCurrency(resto)}
                        </span>
                        {activeRole === 'admin' && (
                            <div className="w-7 h-7 rounded-xl bg-muted/40 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-muted-foreground transition-colors ml-1">
                                <Pencil className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Thin Progress Bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2.5">
                    <div 
                        className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
                        style={{ width: `${Math.min(percentage, 100)}%` }} 
                    />
                </div>

                {/* Sub-metrics */}
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Presupuesto: <span className="text-foreground font-bold">{formatCurrency(amount)}</span></span>
                    <span>Gastado: <span className="text-foreground font-bold">{formatCurrency(gastado)}</span></span>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 pt-4 sm:pt-8 pb-32">
                
                {/* MONTH SELECTOR BAR */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-card rounded-2xl shadow-sm border border-border/50 mb-6 overflow-hidden">
                    <div className="flex items-center gap-2 mx-auto">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={handlePrevMonth}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[120px] px-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                Periodo
                            </span>
                            <span className="text-base font-extrabold text-primary capitalize leading-tight">
                                {selectedMonthLabel}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                            onClick={handleNextMonth}
                        >
                            <ChevronRight className="w-4 h-4 text-primary" />
                        </Button>
                        {!isCurrentMonth && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToCurrentMonth}
                                className="text-xs h-8"
                            >
                                Hoy
                            </Button>
                        )}
                    </div>
                </div>

                {/* TITLE & GLOBAL ACTIONS */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-2 mt-2 sm:mt-0">
                        <PiggyBank className="w-8 h-8 text-primary" />
                        Presupuestos
                    </h1>

                    <div className="grid grid-cols-2 sm:flex sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 mt-4 sm:mt-0 z-10">
                        {activeRole === 'admin' && (
                            <>
                                <Button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    variant="outline"
                                    className="font-bold border-2 text-[11px] sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                                >
                                    <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Añadir
                                </Button>
                                <Button 
                                    onClick={handleCopyPreviousMonth}
                                    variant="secondary"
                                    className="bg-primary/5 hover:bg-primary/15 text-primary border border-primary/20 hover:border-primary/40 font-bold shadow-sm transition-all text-[11px] sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                                >
                                    <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Copiar mes
                                </Button>
                                <Button 
                                    onClick={() => handleAutoAssignFutureExpenses(false)}
                                    variant="secondary"
                                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold shadow-sm transition-all text-[11px] sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                                >
                                    <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Autoasignar
                                </Button>
                                <Button 
                                    onClick={handleClearAll}
                                    variant="destructive"
                                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-bold shadow-sm transition-all text-[11px] sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                                >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    Limpiar
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* DISPONIBLE PARA ASIGNAR & SEARCH CARD (NON-STICKY, NATURAL SCROLL) */}
                <div className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border/50 p-5 sm:p-6 mb-8 shadow-sm">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            Disponible para Asignar
                        </div>
                        <div className={cn(
                            "font-black text-4xl sm:text-5xl transition-colors tracking-tight",
                            disponibleParaAsignar > 0 ? "text-primary" : 
                            disponibleParaAsignar < 0 ? "text-destructive" : 
                            "text-foreground"
                        )}>
                            {formatCurrency(disponibleParaAsignar)}
                        </div>
                        
                        {/* Indicadores secundarios pequeños */}
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 text-[10px] sm:text-xs font-bold text-muted-foreground/80 uppercase tracking-wider bg-muted/30 px-4 py-2 rounded-full border border-border/40">
                            <span>Ingresos: <span className="text-income/90">{formatCurrency(ingresosDelMes)}</span></span>
                            <span className="opacity-40">•</span>
                            <span>Saldo Previsto: <span className="text-foreground/80">{formatCurrency(capitalDisponible)}</span></span>
                        </div>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="mt-6 max-w-md mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar sobre..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-11 h-12 bg-background/80 border-border/50 font-medium text-base rounded-2xl shadow-inner focus-visible:ring-primary/20 transition-all"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    title="Borrar búsqueda"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* LISTS BLOCK */}
                <div className="pb-10">
                    {/* Provisión Próximo Mes */}
                    {isCurrentMonth && nextMonthBudgetsTotal > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <h2 className="text-lg font-bold text-foreground">Provisión Próximo Mes</h2>
                            </div>
                            <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-blue-500/20 shadow-sm overflow-hidden p-5 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-base text-foreground/90 capitalize">
                                        Reservado para {format(parseISO(nextMonthStr + "-01"), "MMMM", { locale: es })}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Suma de los gastos previstos del próximo mes</span>
                                </div>
                                <span className="font-black text-xl text-blue-500">
                                    {formatCurrency(nextMonthBudgetsTotal)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Sobres en Peligro */}
                    {filteredEnPeligro.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <h2 className="text-lg font-bold text-foreground">Sobres en Peligro</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredEnPeligro.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredEnPeligro.map(cat => renderRow(cat, 'peligro'))}
                            </div>
                        </div>
                    )}

                    {/* Sobres Saludables */}
                    {filteredSaludables.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-income shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <h2 className="text-lg font-bold text-foreground">Sobres Saludables</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredSaludables.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredSaludables.map(cat => renderRow(cat, 'saludable'))}
                            </div>
                        </div>
                    )}

                    {/* Sobres Vacíos (Cumplidos) */}
                    {filteredVacios.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-muted-foreground/60 shadow-sm" />
                                <h2 className="text-lg font-bold text-foreground">Sobres Cumplidos</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredVacios.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredVacios.map(cat => renderRow(cat, 'vacio'))}
                            </div>
                        </div>
                    )}

                    {/* Gastos Sin Sobre */}
                    {filteredSinSobre.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                                <h2 className="text-lg font-bold text-foreground">Gastos Sin Sobre</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredSinSobre.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredSinSobre.map(cat => renderRow(cat, 'sin_sobre'))}
                            </div>
                        </div>
                    )}

                    {filteredEnPeligro.length === 0 && filteredSaludables.length === 0 && filteredVacios.length === 0 && filteredSinSobre.length === 0 && (
                        <div className="bg-card/50 rounded-3xl border border-dashed border-border/60 p-12 text-center flex flex-col items-center justify-center mt-8">
                            <PiggyBank className="w-16 h-16 text-muted-foreground/20 mb-4" />
                            <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
                                {searchQuery ? "No se encontraron sobres" : "Añade tu primer sobre para este mes"}
                            </p>
                        </div>
                    )}
                </div>

                {/* MODAL PARA AÑADIR NUEVA CATEGORÍA A LA PLANIFICACIÓN */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Añadir Presupuesto</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Categoría</label>
                                <Select value={newCategoryName} onValueChange={setNewCategoryName}>
                                    <SelectTrigger className="w-full font-bold">
                                        <SelectValue placeholder="Selecciona una categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCategoriesToAdd.map(c => (
                                            <SelectItem key={c.id} value={c.name}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Importe del Presupuesto (€)</label>
                                <div className="relative w-full flex items-center justify-end">
                                    <Input 
                                        type="text"
                                        inputMode="decimal"
                                        value={newCategoryAmount}
                                        onChange={(e) => setNewCategoryAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="h-12 text-right font-bold text-lg focus-visible:ring-1 pr-8"
                                        enterKeyHint="done"
                                    />
                                    <span className="absolute right-3 text-muted-foreground font-bold select-none pointer-events-none">€</span>
                                </div>
                            </div>
                            <Button 
                                onClick={handleConfirmAddCategory} 
                                className="w-full font-black mt-2 h-12"
                            >
                                Añadir a la lista
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* MODAL / BOTTOM SHEET DE ASIGNACIÓN RÁPIDA (PARA CUALQUIER SOBRE) */}
                {editingCategory && (
                    <BudgetAssignmentModal
                        isOpen={!!editingCategory}
                        onClose={() => setEditingCategory(null)}
                        categoryName={editingCategory}
                        currentAmount={localAssignments[editingCategory]?.amount || 0}
                        spent={getGastado(editingCategory)}
                        disponibleParaAsignar={disponibleParaAsignar}
                        monthLabel={selectedMonthLabel}
                        onSave={handleSaveCategoryBudget}
                        onRemove={handleRemoveCategoryBudget}
                    />
                )}

            </div>
        </div>
    );
};

export default BudgetPage;
