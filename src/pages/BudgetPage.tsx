import { useState, useMemo, useEffect } from 'react';
import { loadData, saveData } from '@/lib/storage';
import { Budget, Category, Transaction, Account } from '@/types/finance';
import { formatCurrency, calculateTotalBalance } from '@/lib/calculations';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PiggyBank, PlusCircle, Save, Trash2 } from 'lucide-react';
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
        Object.entries(localAssignments).forEach(([category, { amount, isAuto }]) => {
            newData.budgets.push({
                id: uuidv4(),
                category,
                amount,
                month: currentMonth,
                isAuto,
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
        const gastosMesActual = data.transactions
            .filter(t => t.type === 'expense' && t.category !== 'Transferencia' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);

        return balanceActual + gastosMesActual;
    }, [data, currentMonth]);

    const getGastado = (catName: string) => {
        return data.transactions
            .filter(t => !t.isPending && t.type === 'expense' && t.category === catName && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const manualCategories = Object.keys(localAssignments).filter(cat => !localAssignments[cat].isAuto).sort();
    const autoCategories = Object.keys(localAssignments).filter(cat => localAssignments[cat].isAuto).sort();

    const sumManualBudgets = manualCategories.reduce((sum, cat) => sum + localAssignments[cat].amount, 0);
    const sumAutoBudgets = autoCategories.reduce((sum, cat) => sum + localAssignments[cat].amount, 0);
    const disponibleParaAsignar = Number((capitalDisponible - sumManualBudgets - sumAutoBudgets).toFixed(2));

    return (
        <div className="min-h-screen bg-background lg:pl-20 pt-24 pb-32">
            <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                        <PiggyBank className="w-8 h-8 text-primary" />
                        Presupuestos
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                        <Button 
                            onClick={() => setIsAddModalOpen(true)}
                            variant="outline"
                            className="font-bold border-2 flex-1 sm:flex-none"
                            title="Añadir presupuesto manualmente"
                        >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Añadir manual
                        </Button>

                        <Button 
                            onClick={handleAutoAssignFutureExpenses}
                            variant="secondary"
                            className="font-bold flex-1 sm:flex-none"
                            title="Autoasignar gastos no presupuestados"
                        >
                            <PlusCircle className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Autoasignar</span>
                        </Button>

                        <Button 
                            onClick={handleSave}
                            className="font-black px-6 flex-1 sm:flex-none"
                        >
                            <Save className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Guardar</span>
                        </Button>
                    </div>
                </div>

                <div className="bg-card border-2 border-border/50 overflow-hidden text-sm">
                    {/* TOP TABLE: MANUAL BUDGETS */}
                    <div className="border-b-2 border-border/50">
                        {/* TOTAL CAPITAL ROW */}
                        <div className="flex border-b border-border/50 bg-muted/20">
                            <div className="w-3/4 p-2 sm:p-3 font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                CAPITAL TOTAL DISPONIBLE
                            </div>
                            <div className="w-1/4 p-2 sm:p-3 font-black text-right border-l border-border/50 text-income text-base">
                                {formatCurrency(capitalDisponible)}
                            </div>
                        </div>

                        {/* DISPONIBLE ROW */}
                        <div className="flex border-b border-border/50 bg-muted/20">
                            <div className="w-3/4 p-2 sm:p-3 font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                CANTIDAD TODAVÍA NO ASIGNADA
                            </div>
                            <div className={cn(
                                "w-1/4 p-2 sm:p-3 font-black text-right border-l border-border/50 text-base",
                                disponibleParaAsignar > 0 ? "text-primary" : disponibleParaAsignar < 0 ? "text-destructive" : "text-muted-foreground"
                            )}>
                                {formatCurrency(disponibleParaAsignar)}
                            </div>
                        </div>

                        {/* HEADERS */}
                        <div className="flex border-b border-border/50 bg-muted/10 font-bold uppercase tracking-wider text-[10px] sm:text-xs text-muted-foreground">
                            <div className="w-[35%] p-2 sm:p-3 border-r border-border/50">Categoría</div>
                            <div className="w-[25%] p-2 sm:p-3 border-r border-border/50 text-center">Presupuesto</div>
                            <div className="w-[20%] p-2 sm:p-3 border-r border-border/50 text-center">Gastado</div>
                            <div className="w-[20%] p-2 sm:p-3 text-center">Resto</div>
                        </div>

                        {/* MANUAL ROWS */}
                        {manualCategories.map(cat => {
                            const amount = Number((localAssignments[cat].amount || 0).toFixed(2));
                            const gastado = Number(getGastado(cat).toFixed(2));
                            const resto = Number((amount - gastado).toFixed(2));

                            return (
                                <div key={cat} className="flex border-b border-border/20 hover:bg-muted/5 transition-colors group">
                                    <div className="w-[35%] p-2 sm:p-3 border-r border-border/50 font-bold capitalize flex items-center justify-between">
                                        <span className="truncate">{cat}</span>
                                        <button onClick={() => handleRemoveCategory(cat)} className="text-destructive/50 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="w-[25%] p-1 sm:p-2 border-r border-border/50">
                                        <div className="relative w-full flex items-center justify-end">
                                            <Input 
                                                type="number"
                                                step="0.01"
                                                value={amount === 0 ? '' : amount}
                                                onChange={(e) => handleAssignChange(cat, e.target.value)}
                                                placeholder="0.00"
                                                className="h-8 text-right font-bold focus-visible:ring-1 bg-transparent border-transparent hover:border-input focus:border-input transition-colors w-full pr-5"
                                            />
                                            <span className="absolute right-2 text-muted-foreground font-bold text-xs select-none pointer-events-none">€</span>
                                        </div>
                                    </div>
                                    <div className="w-[20%] p-2 sm:p-3 border-r border-border/50 text-right text-muted-foreground font-medium flex items-center justify-end">
                                        {formatCurrency(gastado)}
                                    </div>
                                    <div className={cn(
                                        "w-[20%] p-2 sm:p-3 text-right font-bold flex items-center justify-end",
                                        resto > 0 ? "text-income" : resto < 0 ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                        {formatCurrency(resto)}
                                    </div>
                                </div>
                            );
                        })}
                        {manualCategories.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-xs uppercase tracking-wider font-bold">
                                Añade presupuestos para este mes
                            </div>
                        )}
                    </div>

                    <div className="h-8 bg-muted/10"></div>

                    {/* BOTTOM TABLE: AUTO BUDGETS */}
                    <div>
                        {/* AUTO HEADERS */}
                        <div className="flex border-b border-t-2 border-border/50 bg-muted/20">
                            <div className="w-full p-2 sm:p-3 font-bold uppercase tracking-wider text-muted-foreground flex items-center text-xs">
                                GASTOS NO PRESUPUESTADOS / AUTOASIGNADOS
                            </div>
                        </div>

                        {/* AUTO ROWS */}
                        {autoCategories.map(cat => {
                            const amount = Number((localAssignments[cat].amount || 0).toFixed(2));
                            const gastado = Number(getGastado(cat).toFixed(2));
                            const resto = Number((amount - gastado).toFixed(2));

                            return (
                                <div key={cat} className="flex border-b border-border/20 hover:bg-muted/5 transition-colors group">
                                    <div className="w-[35%] p-2 sm:p-3 border-r border-border/50 font-bold capitalize flex items-center justify-between text-muted-foreground">
                                        <span className="truncate">{cat}</span>
                                        <button onClick={() => handleRemoveCategory(cat)} className="text-destructive/50 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="w-[25%] p-1 sm:p-2 border-r border-border/50">
                                        <div className="relative w-full flex items-center justify-end">
                                            <Input 
                                                type="number"
                                                step="0.01"
                                                value={amount === 0 ? '' : amount}
                                                onChange={(e) => handleAssignChange(cat, e.target.value)}
                                                placeholder="0.00"
                                                className="h-8 text-right font-bold focus-visible:ring-1 bg-transparent border-transparent hover:border-input focus:border-input transition-colors w-full pr-5 text-muted-foreground"
                                            />
                                            <span className="absolute right-2 text-muted-foreground/60 font-bold text-xs select-none pointer-events-none">€</span>
                                        </div>
                                    </div>
                                    <div className="w-[20%] p-2 sm:p-3 border-r border-border/50 text-right text-muted-foreground/60 font-medium flex items-center justify-end">
                                        {formatCurrency(gastado)}
                                    </div>
                                    <div className={cn(
                                        "w-[20%] p-2 sm:p-3 text-right font-bold flex items-center justify-end",
                                        resto > 0 ? "text-income" : resto < 0 ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                        {formatCurrency(resto)}
                                    </div>
                                </div>
                            );
                        })}
                        {autoCategories.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-xs uppercase tracking-wider font-bold">
                                Sin gastos autoasignados
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
