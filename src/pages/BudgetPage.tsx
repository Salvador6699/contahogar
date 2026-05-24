import { useState, useMemo, useEffect } from 'react';
import { loadData, saveData } from '@/lib/storage';
import { Budget, Category, Transaction, Account } from '@/types/finance';
import { calculateTotalBalance, formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PiggyBank, PlusCircle, ArrowRight, Save, TrendingUp, TrendingDown, Minus, Info, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BudgetPage = () => {
    const [data, setData] = useState(loadData());
    const [currentMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [includeFutureIncomes, setIncludeFutureIncomes] = useState(false);
    
    // We will keep a local state of the budgets being edited for the current month
    // Key: category name, Value: assigned amount
    const [localAssignments, setLocalAssignments] = useState<Record<string, number>>({});

    // Initialize local assignments from DB
    useEffect(() => {
        const assignments: Record<string, number> = {};
        const monthBudgets = data.budgets.filter(b => b.month === currentMonth);
        monthBudgets.forEach(b => {
            assignments[b.category] = b.amount;
        });
        setLocalAssignments(assignments);
    }, [data, currentMonth]);

    // Calculate core financial values
    const calculations = useMemo(() => {
        // 1. Total actual balance (same as home page)
        let unassigned = calculateTotalBalance(data.accounts, data.transactions, false);

        // Add future incomes if checked
        if (includeFutureIncomes) {
            const futureIncomes = data.transactions
                .filter(t => t.isPending && t.type === 'income' && t.date.startsWith(currentMonth))
                .reduce((sum, t) => sum + t.amount, 0);
            unassigned += futureIncomes;
        }

        // Subtract what we are currently assigning in the form
        const totalCurrentAssigned = Object.values(localAssignments).reduce((sum, amount) => sum + (amount || 0), 0);
        unassigned -= totalCurrentAssigned;

        return {
            unassigned,
        };
    }, [data, localAssignments, includeFutureIncomes]);

    const handleAssignChange = (categoryName: string, value: string) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        if (isNaN(numValue)) return;

        setLocalAssignments(prev => ({
            ...prev,
            [categoryName]: numValue
        }));
    };

    const handleAutoAssignFutureExpenses = () => {
        const pendingExpenses = data.transactions.filter(t => t.isPending && t.type === 'expense' && t.date.startsWith(currentMonth));
        
        if (pendingExpenses.length === 0) {
            toast.info('No hay gastos futuros pendientes.');
            return;
        }

        // "borra todo y rehace" - We clear previous assignments and ONLY use pending expenses
        const newAssignments: Record<string, number> = {};
        let assignedCount = 0;

        pendingExpenses.forEach(t => {
            newAssignments[t.category] = (newAssignments[t.category] || 0) + t.amount;
            assignedCount++;
        });

        setLocalAssignments(newAssignments);
        toast.success(`Se borraron los anteriores y se auto-asignaron gastos futuros.`);
    };

    const handleAddCategory = (categoryName: string) => {
        if (!categoryName) return;
        if (localAssignments[categoryName] !== undefined) {
            toast.info('La categoría ya está en el presupuesto.');
            return;
        }
        setLocalAssignments(prev => ({
            ...prev,
            [categoryName]: 0
        }));
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
        Object.entries(localAssignments).forEach(([category, amount]) => {
            if (amount > 0 || amount < 0) { // allow negative for corrections? usually just > 0
                newData.budgets.push({
                    id: uuidv4(),
                    category,
                    amount,
                    month: currentMonth,
                    createdAt: new Date().toISOString()
                });
            }
        });

        saveData(newData);
        setData(newData);
        toast.success('Presupuesto guardado correctamente');
    };

    // We only show categories that are currently in localAssignments
    const sortedCategories = Object.keys(localAssignments).sort();
    const availableCategoriesToAdd = data.categories.filter(c => localAssignments[c.name] === undefined);

    return (
        <div className="min-h-screen app-gradient-bg lg:pl-20 pt-24 pb-32">
            <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-8">
                
                {/* Header & Unassigned */}
                <div className="flex flex-col items-center justify-center text-center mb-10 space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full mb-2">
                        <PiggyBank className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-foreground">Presupuestos</h1>
                    <p className="text-muted-foreground max-w-lg">
                        Asigna tu saldo actual a los sobres que desees.
                    </p>

                    <Card className={cn(
                        "p-6 sm:p-10 w-full max-w-md border-4 transition-colors",
                        calculations.unassigned === 0 ? "border-primary/20 bg-primary/5" :
                        calculations.unassigned > 0 ? "border-income/20 bg-income/5" :
                        "border-destructive/20 bg-destructive/5"
                    )}>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Disponible para Asignar
                        </h2>
                        <p className={cn(
                            "text-5xl font-black tracking-tighter",
                            calculations.unassigned === 0 ? "text-primary" :
                            calculations.unassigned > 0 ? "text-income" :
                            "text-destructive"
                        )}>
                            {formatCurrency(calculations.unassigned)}
                        </p>
                    </Card>

                    <div className="flex items-center gap-2 mt-4 text-sm font-medium text-muted-foreground">
                        <Checkbox 
                            id="futureIncomes" 
                            checked={includeFutureIncomes} 
                            onCheckedChange={(c) => setIncludeFutureIncomes(!!c)}
                        />
                        <label htmlFor="futureIncomes" className="cursor-pointer">
                            Incluir ingresos futuros (+{formatCurrency(
                                data.transactions.filter(t => t.isPending && t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0)
                            )})
                        </label>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                    <Button 
                        onClick={handleAutoAssignFutureExpenses}
                        variant="secondary"
                        className="w-full sm:w-auto font-bold"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Auto-asignar gastos futuros
                    </Button>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                        <Select onValueChange={handleAddCategory}>
                            <SelectTrigger className="w-full sm:w-[200px] font-bold">
                                <SelectValue placeholder="Añadir presupuesto..." />
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

                    <Button 
                        onClick={handleSave}
                        className="w-full sm:w-auto font-black px-8"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Presupuesto
                    </Button>
                </div>

                {/* Envelopes Grid */}
                <div className="space-y-4">
                    {/* Header Row (Desktop) */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-5">Categoría</div>
                        <div className="col-span-3 text-right">Asignar</div>
                        <div className="col-span-4 text-right">Acciones</div>
                    </div>

                    {sortedCategories.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No hay presupuestos creados. Auto-asigna o añade uno manualmente.
                        </div>
                    )}

                    {sortedCategories.map(catName => {
                        const assignedAmount = localAssignments[catName] || 0;
                        const catObj = data.categories.find(c => c.name === catName);
                        
                        // Icon rendering logic
                        let IconElement = <Icons.Tag className="w-5 h-5 text-white" />;
                        if (catObj?.icon && (Icons as any)[catObj.icon]) {
                            const IconComp = (Icons as any)[catObj.icon];
                            IconElement = <IconComp className="w-5 h-5 text-white" />;
                        }

                        return (
                            <Card key={catName} className="overflow-hidden hover:shadow-md transition-all border-border/50">
                                <div className="p-4 sm:p-0">
                                    <div className="sm:grid sm:grid-cols-12 gap-4 items-center sm:px-4 sm:py-3">
                                        
                                        {/* Category Info */}
                                        <div className="col-span-5 flex items-center gap-3 mb-4 sm:mb-0">
                                            {catObj?.customIcon ? (
                                                <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-muted overflow-hidden">
                                                    <img src={catObj.customIcon} alt={catName} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div 
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                                    style={{ backgroundColor: catObj?.color || '#ef4444' }}
                                                >
                                                    {IconElement}
                                                </div>
                                            )}
                                            <p className="font-black text-foreground capitalize truncate text-lg sm:text-base">
                                                {catName}
                                            </p>
                                        </div>

                                        {/* Assigned Input */}
                                        <div className="col-span-3 text-center sm:text-right relative mb-3 sm:mb-0 flex justify-center sm:justify-end">
                                            <div className="relative w-full max-w-[120px]">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
                                                <Input 
                                                    type="number"
                                                    value={assignedAmount === 0 ? '' : assignedAmount}
                                                    onChange={(e) => handleAssignChange(catName, e.target.value)}
                                                    placeholder="0.00"
                                                    className="pl-8 text-right font-bold h-10 focus:border-primary/50"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-4 flex items-center justify-center sm:justify-end">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveCategory(catName)}
                                                className="text-destructive hover:bg-destructive/10"
                                                title="Eliminar de presupuestos"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default BudgetPage;
