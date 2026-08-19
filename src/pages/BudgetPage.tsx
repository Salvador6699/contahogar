import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadData, saveData } from '@/lib/storage';
import { Budget, Category, Transaction, Account } from '@/types/finance';
import { formatCurrency, calculateTotalBalance } from '@/lib/calculations';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PiggyBank, PlusCircle, Save, Trash2, Plus, Minus, Search, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { appToast as toast } from "@/lib/swal";
import { cn } from '@/lib/utils';
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

const BudgetPage = () => {
    const { activeRole } = useTeam();
    const [legacyData, setLegacyData] = useState(loadData());
    const { accounts, isLoading: isAccLoading } = useAccounts();
    const { transactions, isLoading: isTxLoading } = useTransactions();
    const { categories, isLoading: isCatLoading } = useCategories();
    const { budgets, saveBudgets, isBudgetsLoading: isBudLoading } = usePlanning();

    const data = useMemo(() => ({
        ...legacyData,
        accounts,
        transactions,
        categories,
        budgets
    }), [legacyData, accounts, transactions, categories, budgets]);

    useEffect(() => {
        setLegacyData(loadData());
    }, []);
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
    
    // We will keep a local state of the budgets being edited for the current month
    // Key: category name, Value: object with amount and isAuto
    const [localAssignments, setLocalAssignments] = useState<Record<string, { amount: number, isAuto: boolean }>>({});
    
    // State for the "Añadir cantidad" input on each card
    const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

    // State for searching categories
    const [searchQuery, setSearchQuery] = useState(searchParams.get('category') || '');

    // Initialize local assignments from DB
    useEffect(() => {
        const assignments: Record<string, { amount: number, isAuto: boolean }> = {};
        const monthBudgets = data.budgets.filter(b => b.month === activeMonth && b.category !== 'Transferencia');
        monthBudgets.forEach(b => {
            assignments[b.category] = { amount: b.amount, isAuto: !!b.isAuto };
        });
        setLocalAssignments(assignments);
    }, [data, activeMonth]);

    const handleAssignChange = (categoryName: string, value: string) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        if (isNaN(numValue)) return;

        setLocalAssignments(prev => ({
            ...prev,
            [categoryName]: { ...(prev[categoryName] || { isAuto: false }), amount: numValue }
        }));
    };

    const handleAddAmount = (cat: string, isSubtract: boolean = false) => {
        const inputVal = parseFloat(addAmounts[cat] || '0');
        if (isNaN(inputVal) || inputVal === 0) return;
        
        const amountToAdd = isSubtract ? -Math.abs(inputVal) : Math.abs(inputVal);
        
        setLocalAssignments(prev => {
            const currentAmount = prev[cat]?.amount || 0;
            const newAmount = Math.max(0, currentAmount + amountToAdd);
            return {
                ...prev,
                [cat]: { ...(prev[cat] || { isAuto: false }), amount: newAmount }
            };
        });
        
        // Clear input after adding
        setAddAmounts(prev => ({ ...prev, [cat]: '' }));
    };

    const handleAutoAssignFutureExpenses = (silent = false) => {
        setLocalAssignments(prev => {
            const next = { ...prev };
            let assignedCount = 0;

            // Encontrar gastos reales y futuros del mes (excluyendo transferencias)
            const monthExpenses = data.transactions.filter(t => 
                t.type === 'expense' && 
                t.date.startsWith(activeMonth) &&
                t.category !== 'Transferencia' &&
                !t.isIgnored
            );

            // Limpiar sobres automáticos anteriores para recalcular desde cero
            Object.keys(next).forEach(cat => {
                if (next[cat].isAuto) {
                    delete next[cat];
                }
            });

            // Agrupar por categoría
            const spentByCategory: Record<string, number> = {};
            monthExpenses.forEach(t => {
                spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
            });

            // Solo asignar si la categoría no tiene un presupuesto manual
            Object.entries(spentByCategory).forEach(([category, amount]) => {
                if (!next[category]) {
                    next[category] = { amount, isAuto: true };
                    assignedCount++;
                }
            });

            if (assignedCount === 0) return prev; // Evita re-renderizados innecesarios

            if (!silent) {
                toast.success(`${assignedCount} gastos futuros autoasignados`);
            }
            return next;
        });
    };

    // Auto-asignar silenciosamente al cargar transacciones o cambiar de mes
    useEffect(() => {
        handleAutoAssignFutureExpenses(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMonth, data.transactions]);

    const handleClearAll = async () => {
        const result = await Swal.fire({
            title: '¿Limpiar presupuestos?',
            text: '¿Estás seguro de que quieres limpiar todos los presupuestos de este mes? (Se aplicará al guardar)',
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
            toast.success('Todos los presupuestos limpiados. No olvides guardar.');
        }
    };

    const handleCopyPreviousMonth = () => {
        const current = parseISO(activeMonth + "-01");
        const prevMonthStr = format(subMonths(current, 1), "yyyy-MM");
        
        const prevMonthBudgets = data.budgets.filter(b => b.month === prevMonthStr && b.category !== 'Transferencia');
        
        setLocalAssignments(prev => {
            const next = { ...prev };
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
                toast.success(`${copiedCount} presupuestos copiados del mes anterior`);
            } else {
                toast.info('No hay presupuestos manuales nuevos que copiar');
            }
            return next;
        });
    };

    const handleConfirmAddCategory = () => {
        if (!newCategoryName) {
            toast.error("Por favor, selecciona una categoría.");
            return;
        }
        
        const numValue = newCategoryAmount === '' ? 0 : parseFloat(newCategoryAmount);
        if (isNaN(numValue)) {
            toast.error("El importe no es válido.");
            return;
        }

        setLocalAssignments(prev => ({
            ...prev,
            [newCategoryName]: { amount: numValue, isAuto: false }
        }));
        
        setIsAddModalOpen(false);
        setNewCategoryName('');
        setNewCategoryAmount('');
    };

    const handleRemoveCategory = (categoryName: string) => {
        setLocalAssignments(prev => {
            const copy = { ...prev };
            delete copy[categoryName];
            return copy;
        });
    };

    const handleSave = async () => {
        const newBudgets: Budget[] = [];
        
        Object.entries(localAssignments).forEach(([category, { amount }]) => {
            newBudgets.push({
                id: uuidv4(),
                category,
                amount,
                month: activeMonth,
                isAuto: false,
                createdAt: new Date().toISOString()
            });
        });

        await saveBudgets({ month: activeMonth, budgets: newBudgets });
        toast.success('Presupuesto guardado correctamente en la nube');
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
        const balanceActual = calculateTotalBalance(data.accounts, data.transactions, true, activeMonth);
        return Number(balanceActual.toFixed(2));
    }, [data, activeMonth]);

    const gastosMesActual = useMemo(() => {
        return Number(data.transactions
            .filter(t => t.type === 'expense' && t.category !== 'Transferencia' && t.date.startsWith(activeMonth) && !t.isIgnored)
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
    }, [data.transactions, activeMonth]);

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

        // Dentro del grupo rojo (0): el más negativo primero
        if (groupA === 0) {
            return restoA - restoB; 
        }
        
        // Dentro del grupo verde (1): el que tiene más dinero restante primero
        if (groupA === 1) {
            return restoB - restoA;
        }

        // Dentro del grupo gris (2): orden alfabético
        return a.localeCompare(b);
    };

    const getSortPercentage = (cat: string) => {
        const amount = localAssignments[cat]?.amount || 0;
        const gastado = getGastado(cat);
        return amount > 0 ? (gastado / amount) * 100 : (gastado > 0 ? 100 : 0);
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
        // Encontrar gastos previstos del próximo mes que NO estén ignorados
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
        const baseCapital = calculateTotalBalance(data.accounts, data.transactions, true, currentMonthKey);
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

        // Resguardar el capital necesario para el próximo mes
        noAsignada -= nextMonthBudgetsTotal;

        return Number(noAsignada.toFixed(2));
    }, [activeMonth, currentMonthKey, sumManualBudgets, sumAutoBudgets, data, nextMonthBudgetsTotal]);

    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const toggleRow = (cat: string) => {
        const isExpanding = expandedRow !== cat;
        setExpandedRow(isExpanding ? cat : null);
        
        if (isExpanding) {
            setTimeout(() => {
                const el = document.getElementById(`row-${cat}`);
                if (el) {
                    el.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 300);
        }
    };



    const disponibleBasadoEnIngresos = Number((ingresosDelMes - sumManualBudgets - sumAutoBudgets).toFixed(2));

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
        const isExpanded = expandedRow === cat;
        
        let colorClass = "bg-muted-foreground";
        if (type === 'peligro') colorClass = "bg-destructive";
        else if (type === 'saludable') colorClass = "bg-income";
        else if (type === 'vacio') colorClass = "bg-muted-foreground/60";

        return (
            <div key={cat} id={`row-${cat}`} className="scroll-mt-[340px] md:scroll-mt-[260px] [@media(max-height:550px)]:scroll-mt-[90px] bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden transition-all">
                {/* COMPACT ROW */}
                <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleRow(cat)}
                >
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-base capitalize truncate pr-4 text-foreground/90">{cat}</h3>
                            <span className={cn("font-black text-lg", resto > 0 ? "text-income" : resto < 0 ? "text-destructive" : "text-foreground")}>
                                {formatCurrency(resto)}
                            </span>
                        </div>
                        {/* Thin Progress Bar */}
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                            <div 
                                className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
                                style={{ width: `${Math.min(percentage, 100)}%` }} 
                            />
                        </div>
                    </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                    <div className="p-4 pt-2 border-t border-border/30 bg-muted/5 animate-in slide-in-from-top-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 bg-background/50 p-2 rounded-xl border border-border/40">
                            <div className="flex flex-col"><span>Presupuesto</span> <span className="text-foreground text-xs">{formatCurrency(amount)}</span></div>
                            <div className="flex flex-col text-right"><span>Gastado</span> <span className="text-foreground text-xs">{formatCurrency(gastado)}</span></div>
                        </div>
                        
                        {activeRole === 'admin' && (
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                <div className="relative flex-1 min-w-[120px] group">
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="0.00" 
                                        value={addAmounts[cat] || ''}
                                        onChange={(e) => setAddAmounts(prev => ({ ...prev, [cat]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddAmount(cat, false); }}
                                        autoFocus
                                        className="h-12 pl-4 pr-8 text-base font-bold bg-background border-border/60 focus-visible:ring-primary/30 rounded-2xl shadow-inner"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold select-none pointer-events-none">€</span>
                                </div>
                                <Button onClick={() => handleAddAmount(cat, false)} variant="secondary" size="icon" className="h-12 w-12 shrink-0 rounded-2xl font-bold bg-income/10 text-income hover:bg-income hover:text-white transition-colors shadow-sm">
                                    <Plus className="w-5 h-5" />
                                </Button>
                                <Button onClick={() => handleAddAmount(cat, true)} variant="secondary" size="icon" className="h-12 w-12 shrink-0 rounded-2xl font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors shadow-sm">
                                    <Minus className="w-5 h-5" />
                                </Button>
                                <Button onClick={() => handleRemoveCategory(cat)} variant="ghost" size="icon" className="h-12 w-12 shrink-0 rounded-2xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 sm:ml-2 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Añadir Presupuesto</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <Select onValueChange={setNewCategoryName}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategoriesToAdd.map(c => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input 
                            type="number" 
                            placeholder="Importe" 
                            value={newCategoryAmount}
                            onChange={(e) => setNewCategoryAmount(e.target.value)}
                        />
                        <Button onClick={handleConfirmAddCategory}>Guardar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div 
                className="w-full max-w-5xl mx-auto px-4 lg:px-8 pt-4 sm:pt-8 transition-all duration-500 pb-32 scroll-mt-14"
                onTouchMove={() => {
                    const active = document.activeElement as HTMLElement;
                    if (active && active.tagName === 'INPUT') {
                        active.blur();
                    }
                }}
            >
                
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

                <div className="sticky [@media(max-height:550px)]:static top-14 lg:top-20 z-30 bg-background/95 backdrop-blur-xl pt-2 pb-4 mb-8 border-b border-border/20 -mx-4 px-4 sm:mx-0 sm:px-0 shadow-sm transition-all duration-300">
                    <div className="flex flex-col items-center justify-center p-4">
                        <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
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
                        <div className="flex items-center gap-3 sm:gap-4 mt-4 text-[10px] sm:text-xs font-bold text-muted-foreground/80 uppercase tracking-wider bg-muted/20 px-4 py-2 rounded-full border border-border/40">
                            <span>Ingresos: <span className="text-income/90">{formatCurrency(ingresosDelMes)}</span></span>
                            <span className="opacity-40">•</span>
                            <span>Saldo Previsto: <span className="text-foreground/80">{formatCurrency(capitalDisponible)}</span></span>
                        </div>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="mt-6 px-2">
                        <div className="relative w-full max-w-md mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar sobre..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-11 h-12 bg-muted/30 border-border/40 font-medium rounded-full shadow-inner focus-visible:ring-primary/20 transition-all"
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

                    {/* Listas de Sobres */}

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
                                        {availableCategoriesToAdd.map(cat => (
                                            <SelectItem key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Importe del Presupuesto (€)</label>
                                <div className="relative w-full flex items-center justify-end">
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={newCategoryAmount}
                                        onChange={(e) => setNewCategoryAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="h-12 text-right font-bold text-lg focus-visible:ring-1 pr-8"
                                        autoFocus
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

            </div>

            {/* FLOATING ACTION BUTTON PARA GUARDAR */}
            {activeRole === 'admin' && (
                <div className="fixed bottom-24 [@media(max-height:550px)]:bottom-[80px] right-4 sm:bottom-8 sm:right-8 z-[100] animate-in fade-in slide-in-from-bottom-5">
                    <Button 
                        onClick={handleSave} 
                        size="lg"
                        className="font-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-primary/50 transition-all h-14 [@media(max-height:550px)]:h-10 [@media(max-height:550px)]:px-4 [@media(max-height:550px)]:text-xs rounded-full px-6 bg-primary text-primary-foreground hover:scale-105"
                    >
                        <Save className="w-5 h-5 [@media(max-height:550px)]:w-4 [@media(max-height:550px)]:h-4 mr-2 [@media(max-height:550px)]:mr-1" />
                        Guardar Cambios
                    </Button>
                </div>
            )}
        </div>
    );
};

export default BudgetPage;
