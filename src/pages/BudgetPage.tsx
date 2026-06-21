import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadData, saveData } from '@/lib/storage';
import { Budget, Category, Transaction, Account } from '@/types/finance';
import { formatCurrency, calculateTotalBalance } from '@/lib/calculations';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PiggyBank, PlusCircle, Save, Trash2, Plus, Minus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

const BudgetPage = () => {
    const [data, setData] = useState(loadData());
    const [currentMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryAmount, setNewCategoryAmount] = useState('');
    
    // We will keep a local state of the budgets being edited for the current month
    // Key: category name, Value: object with amount and isAuto
    const [localAssignments, setLocalAssignments] = useState<Record<string, { amount: number, isAuto: boolean }>>({});
    
    // State for the "Añadir cantidad" input on each card
    const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});

    // State for searching categories
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('category') || '');

    // Initialize local assignments from DB
    useEffect(() => {
        const assignments: Record<string, { amount: number, isAuto: boolean }> = {};
        const monthBudgets = data.budgets.filter(b => b.month === currentMonth && b.category !== 'Transferencia');
        monthBudgets.forEach(b => {
            assignments[b.category] = { amount: b.amount, isAuto: !!b.isAuto };
        });
        setLocalAssignments(assignments);
    }, [data, currentMonth]);

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

    const handleAutoAssignFutureExpenses = () => {
        setLocalAssignments(prev => {
            const next = { ...prev };
            let assignedCount = 0;

            // Encontrar gastos reales y futuros del mes (excluyendo transferencias)
            const monthExpenses = data.transactions.filter(t => 
                t.type === 'expense' && 
                t.date.startsWith(currentMonth) &&
                t.category !== 'Transferencia'
            );

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

            if (assignedCount === 0) {
                toast.info('No se encontraron nuevos gastos sin presupuesto.');
            } else {
                toast.success(`Se añadieron ${assignedCount} categorías autoasignadas.`);
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

    const handleSave = () => {
        const newData = { ...data };
        
        // Remove all budgets for the current month
        newData.budgets = newData.budgets.filter(b => b.month !== currentMonth);
        
        // Add the new budgets from local state
        Object.entries(localAssignments).forEach(([category, { amount }]) => {
            newData.budgets.push({
                id: uuidv4(),
                category,
                amount,
                month: currentMonth,
                isAuto: false, // Guardado manual
                createdAt: new Date().toISOString()
            });
        });

        saveData(newData);
        setData(newData);
        toast.success('Presupuesto guardado correctamente');
    };

    const incomeOnlyCategories = useMemo(() => {
        const incomeCats = new Set<string>();
        const expenseCats = new Set<string>();
        data.transactions.forEach(t => {
            if (t.type === 'income') incomeCats.add(t.category);
            if (t.type === 'expense') expenseCats.add(t.category);
        });
        // También añadimos la palabra "Sueldo" por defecto si no tiene gastos
        if (!expenseCats.has('Sueldo')) incomeCats.add('Sueldo');
        if (!expenseCats.has('Nómina')) incomeCats.add('Nómina');
        
        return new Set([...incomeCats].filter(c => !expenseCats.has(c)));
    }, [data.transactions]);

    const availableCategoriesToAdd = data.categories.filter(c => 
        (localAssignments[c.name] === undefined || localAssignments[c.name].isAuto) && 
        c.name !== 'Transferencia' &&
        !incomeOnlyCategories.has(c.name)
    );

    // Calculos globales
    const capitalDisponible = useMemo(() => {
        // Obtenemos el balance proyectado total hasta final del mes seleccionado
        // Esto es exactamente lo que hace el Dashboard para calcular el "Capital"
        const balanceActual = calculateTotalBalance(data.accounts, data.transactions, true, currentMonth);
        
        // A este balance le sumamos los gastos del mes actual, 
        // ya que los gastos del mes no deben reducir tu dinero "Disponible para asignar" 
        // (esos gastos ya se van descontando de los presupuestos asignados en la tabla de abajo)
        const gastosMesActual = Number(data.transactions
            .filter(t => t.type === 'expense' && t.category !== 'Transferencia' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));

        return Number((balanceActual + gastosMesActual).toFixed(2));
    }, [data, currentMonth]);

    const ingresosDelMes = useMemo(() => {
        return Number(data.transactions
            .filter(t => t.type === 'income' && t.category !== 'Transferencia' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
    }, [data.transactions, currentMonth]);

    const getGastado = (catName: string) => {
        return Number(data.transactions
            .filter(t => !t.isPending && t.type === 'expense' && t.category === catName && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
    };

    const getRestoForSort = (catName: string) => {
        const amount = localAssignments[catName]?.amount || 0;
        const gastado = getGastado(catName);
        return amount - gastado;
    };

    const manualCategories = Object.keys(localAssignments)
        .filter(cat => !localAssignments[cat].isAuto)
        .sort((a, b) => getRestoForSort(b) - getRestoForSort(a));

    const autoCategories = Object.keys(localAssignments)
        .filter(cat => localAssignments[cat].isAuto)
        .sort((a, b) => getRestoForSort(b) - getRestoForSort(a));

    const sumManualBudgets = Number(manualCategories.reduce((sum, cat) => sum + localAssignments[cat].amount, 0).toFixed(2));
    const sumAutoBudgets = Number(autoCategories.reduce((sum, cat) => sum + localAssignments[cat].amount, 0).toFixed(2));
    const disponibleParaAsignar = Number((capitalDisponible - sumManualBudgets - sumAutoBudgets).toFixed(2));
    const disponibleBasadoEnIngresos = Number((ingresosDelMes - sumManualBudgets - sumAutoBudgets).toFixed(2));

    const filteredManualCategories = manualCategories.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredAutoCategories = autoCategories.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-background pt-24 pb-24 lg:pb-8">
            <div className="w-full max-w-full mx-auto px-4 lg:px-12 pt-2 sm:pt-8">
                
                {/* PAGE TITLE & ACTION BUTTONS (Scrolls away) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-2 mt-2 sm:mt-0">
                        <PiggyBank className="w-8 h-8 text-primary" />
                        Presupuestos
                    </h1>

                    <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
                        <Button 
                            onClick={() => setIsAddModalOpen(true)}
                            variant="outline"
                            className="font-bold border-2 flex-1 sm:flex-none h-11"
                            title="Añadir presupuesto manualmente"
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Añadir manual
                        </Button>

                        <Button 
                            onClick={handleAutoAssignFutureExpenses}
                            variant="secondary"
                            className="font-bold flex-1 sm:flex-none h-11"
                            title="Autoasignar gastos no presupuestados"
                        >
                            <PlusCircle className="w-5 h-5 sm:mr-2" />
                            <span className="hidden sm:inline">Autoasignar</span>
                        </Button>

                        <Button 
                            onClick={handleSave}
                            className="font-black px-6 flex-1 sm:flex-none h-11"
                        >
                            <Save className="w-5 h-5 sm:mr-2" />
                            <span className="hidden sm:inline text-base">Guardar Cambios</span>
                        </Button>
                    </div>
                </div>

                {/* STICKY SUMMARY CARDS & SEARCH */}
                <div className="sticky top-14 lg:top-20 z-30 bg-background/95 backdrop-blur-xl pt-2 pb-4 mb-8 border-b border-border/20 -mx-4 px-4 sm:mx-0 sm:px-0 shadow-sm">
                    {/* GLOBAL SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TOTAL CAPITAL ROW */}
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col justify-center">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                        CAPITAL TOTAL
                                    </div>
                                    <div className="font-black text-2xl sm:text-3xl text-foreground">
                                        {formatCurrency(capitalDisponible)}
                                    </div>
                                </div>
                                <div className="text-right border-l pl-4 border-border/40 flex-shrink-0">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                        INGRESOS DEL MES
                                    </div>
                                    <div className="font-black text-lg sm:text-xl text-income/90">
                                        {formatCurrency(ingresosDelMes)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DISPONIBLE ROW */}
                        <div className={cn(
                            "rounded-2xl border shadow-sm p-5 flex flex-col justify-center transition-colors",
                            disponibleParaAsignar > 0 ? "bg-primary/5 border-primary/20" : 
                            disponibleParaAsignar < 0 ? "bg-destructive/5 border-destructive/20" : 
                            "bg-muted/10 border-border/50"
                        )}>
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <div className={cn(
                                        "text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-1",
                                        disponibleParaAsignar > 0 ? "text-primary/70" : 
                                        disponibleParaAsignar < 0 ? "text-destructive/70" : 
                                        "text-muted-foreground"
                                    )}>
                                        NO ASIGNADA (GLOBAL)
                                    </div>
                                    <div className={cn(
                                        "font-black text-2xl sm:text-3xl",
                                        disponibleParaAsignar > 0 ? "text-primary" : 
                                        disponibleParaAsignar < 0 ? "text-destructive" : 
                                        "text-muted-foreground"
                                    )}>
                                        {formatCurrency(disponibleParaAsignar)}
                                    </div>
                                </div>
                                <div className="text-right border-l pl-4 border-border/40 flex-shrink-0">
                                    <div className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider mb-1",
                                        disponibleBasadoEnIngresos > 0 ? "text-income/70" : 
                                        disponibleBasadoEnIngresos < 0 ? "text-destructive/70" : 
                                        "text-muted-foreground/70"
                                    )}>
                                        REMANENTE (MES)
                                    </div>
                                    <div className={cn(
                                        "font-black text-lg sm:text-xl",
                                        disponibleBasadoEnIngresos > 0 ? "text-income/90" : 
                                        disponibleBasadoEnIngresos < 0 ? "text-destructive/90" : 
                                        "text-muted-foreground/80"
                                    )}>
                                        {formatCurrency(disponibleBasadoEnIngresos)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEARCH BAR (FIXED) */}
                    <div className="mt-5">
                        <div className="relative w-full max-w-md mx-auto sm:max-w-none sm:w-64 sm:ml-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar categoría..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-9 h-10 bg-muted/20 border-border/50 font-medium"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    title="Borrar búsqueda"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* AUTO BUDGETS */}
                {autoCategories.length > 0 && (
                    <div className="pb-10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                            Gastos No Presupuestados (Autoasignados)
                            <span className="bg-muted text-muted-foreground text-xs py-1 px-2 rounded-full">
                                {filteredAutoCategories.length !== autoCategories.length 
                                    ? `${filteredAutoCategories.length}/${autoCategories.length}` 
                                    : autoCategories.length}
                            </span>
                        </h2>
                        
                        {filteredAutoCategories.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 opacity-90">
                                {filteredAutoCategories.map(cat => {
                                    const amount = Number((localAssignments[cat].amount || 0).toFixed(2));
                                    const gastado = Number(getGastado(cat).toFixed(2));
                                    const resto = Number((amount - gastado).toFixed(2));
                                    const percentage = amount > 0 ? (gastado / amount) * 100 : gastado > 0 ? 100 : 0;

                                    return (
                                        <div key={cat} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md grayscale-[30%]">
                                            <div className="p-4 border-b border-border/30 flex justify-between items-center bg-muted/20">
                                            <h3 className="font-bold text-[17px] capitalize text-muted-foreground truncate pr-2">{cat}</h3>
                                            <button onClick={() => handleRemoveCategory(cat)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full p-1.5 transition-colors" title="Eliminar presupuesto">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="p-5 flex-1 flex flex-col gap-5">
                                            {/* Progress Bar */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <span>Progreso</span>
                                                    <span className={percentage >= 100 ? "text-destructive" : "text-primary"}>{percentage.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn("h-full rounded-full transition-all duration-500", percentage >= 100 ? "bg-destructive/70" : "bg-primary/70")} 
                                                        style={{ width: `${Math.min(percentage, 100)}%` }} 
                                                    />
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3 mt-1">
                                                <div className="bg-muted/10 p-3 rounded-xl border border-border/40 flex flex-col justify-center">
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Presupuesto</p>
                                                    <p className="font-black text-lg leading-none">{formatCurrency(amount)}</p>
                                                </div>
                                                <div className="bg-muted/10 p-3 rounded-xl border border-border/40 flex flex-col justify-center">
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Gastado</p>
                                                    <p className="font-black text-lg leading-none text-muted-foreground/80">{formatCurrency(gastado)}</p>
                                                </div>
                                            </div>

                                            {/* Resto */}
                                            <div className={cn(
                                                "p-4 rounded-xl border flex justify-between items-center",
                                                resto > 0 ? "bg-income/5 border-income/10 text-income/80" : 
                                                resto < 0 ? "bg-destructive/5 border-destructive/10 text-destructive/80" : 
                                                "bg-muted/20 border-border/30 text-muted-foreground"
                                            )}>
                                                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Resto</span>
                                                <span className="font-black text-2xl leading-none">{formatCurrency(resto)}</span>
                                            </div>

                                            {/* Add amount input */}
                                            <div className="flex items-center gap-1.5 mt-auto pt-1">
                                                <div className="relative flex-1 group">
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        placeholder="Cantidad..." 
                                                        value={addAmounts[cat] || ''}
                                                        onChange={(e) => setAddAmounts(prev => ({ ...prev, [cat]: e.target.value }))}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddAmount(cat, false); }}
                                                        className="h-10 pr-7 text-sm font-bold bg-muted/10 border-border/50 group-hover:border-primary/30 transition-colors"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs select-none pointer-events-none">€</span>
                                                </div>
                                                <Button onClick={() => handleAddAmount(cat, false)} variant="secondary" size="icon" className="h-10 w-10 shrink-0 font-bold hover:bg-income hover:text-white transition-colors" title="Sumar cantidad">
                                                    <Plus className="w-5 h-5" />
                                                </Button>
                                                <Button onClick={() => handleAddAmount(cat, true)} variant="secondary" size="icon" className="h-10 w-10 shrink-0 font-bold hover:bg-destructive hover:text-white transition-colors" title="Restar cantidad">
                                                    <Minus className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        ) : (
                            <div className="bg-muted/10 rounded-2xl border border-dashed border-border/50 p-8 text-center">
                                <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
                                    No hay gastos autoasignados que coincidan
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {/* CARDS BLOCK */}
                <div className="pb-10">
                    {/* MANUAL BUDGETS */}
                    <div className="mb-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                Presupuestos Manuales
                                <span className="bg-primary/10 text-primary text-xs py-1 px-2 rounded-full">
                                    {filteredManualCategories.length !== manualCategories.length 
                                        ? `${filteredManualCategories.length}/${manualCategories.length}` 
                                        : manualCategories.length}
                                </span>
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {filteredManualCategories.map(cat => {
                            const amount = Number((localAssignments[cat].amount || 0).toFixed(2));
                            const gastado = Number(getGastado(cat).toFixed(2));
                            const resto = Number((amount - gastado).toFixed(2));
                            const percentage = amount > 0 ? (gastado / amount) * 100 : gastado > 0 ? 100 : 0;

                            return (
                                <div key={cat} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-primary/20">
                                    <div className="p-4 border-b border-border/30 flex justify-between items-center bg-muted/10">
                                        <h3 className="font-bold text-[17px] capitalize text-foreground truncate pr-2">{cat}</h3>
                                        <button onClick={() => handleRemoveCategory(cat)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full p-1.5 transition-colors" title="Eliminar presupuesto">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="p-5 flex-1 flex flex-col gap-5">
                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <span>Progreso</span>
                                                <span className={percentage >= 100 ? "text-destructive" : "text-primary"}>{percentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-500", percentage >= 100 ? "bg-destructive" : "bg-primary")} 
                                                    style={{ width: `${Math.min(percentage, 100)}%` }} 
                                                />
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            <div className="bg-muted/20 p-3 rounded-xl border border-border/40 flex flex-col justify-center">
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Presupuesto</p>
                                                <p className="font-black text-lg leading-none">{formatCurrency(amount)}</p>
                                            </div>
                                            <div className="bg-muted/20 p-3 rounded-xl border border-border/40 flex flex-col justify-center">
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Gastado</p>
                                                <p className="font-black text-lg leading-none text-muted-foreground/80">{formatCurrency(gastado)}</p>
                                            </div>
                                        </div>

                                        {/* Resto */}
                                        <div className={cn(
                                            "p-4 rounded-xl border-2 flex justify-between items-center",
                                            resto > 0 ? "bg-income/5 border-income/20 text-income" : 
                                            resto < 0 ? "bg-destructive/5 border-destructive/20 text-destructive" : 
                                            "bg-muted/20 border-border/30 text-muted-foreground"
                                        )}>
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Resto</span>
                                            <span className="font-black text-2xl leading-none">{formatCurrency(resto)}</span>
                                        </div>

                                        {/* Add amount input */}
                                        <div className="flex items-center gap-1.5 mt-auto pt-1">
                                            <div className="relative flex-1 group">
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="Cantidad..." 
                                                    value={addAmounts[cat] || ''}
                                                    onChange={(e) => setAddAmounts(prev => ({ ...prev, [cat]: e.target.value }))}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddAmount(cat, false); }}
                                                    className="h-10 pr-7 text-sm font-bold bg-muted/10 border-border/50 group-hover:border-primary/30 transition-colors"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs select-none pointer-events-none">€</span>
                                            </div>
                                            <Button onClick={() => handleAddAmount(cat, false)} variant="secondary" size="icon" className="h-10 w-10 shrink-0 font-bold hover:bg-income hover:text-white transition-colors" title="Sumar cantidad">
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                            <Button onClick={() => handleAddAmount(cat, true)} variant="secondary" size="icon" className="h-10 w-10 shrink-0 font-bold hover:bg-destructive hover:text-white transition-colors" title="Restar cantidad">
                                                <Minus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {filteredManualCategories.length === 0 && (
                        <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center">
                            <PiggyBank className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
                                {searchQuery ? "No se encontraron categorías manuales" : "Añade presupuestos para este mes"}
                            </p>
                        </div>
                    )}
                </div>

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
        </div>
    );
};

export default BudgetPage;
