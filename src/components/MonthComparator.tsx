import { useState, useMemo } from 'react';
import { parseISO, format, subMonths } from 'date-fns';
import { 
    ArrowLeftRight, 
    Calendar, 
    Filter, 
    TrendingDown, 
    TrendingUp, 
    Minus, 
    Layers, 
    Check, 
    Clock,
    EyeOff,
    RotateCcw,
    X,
    Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Transaction } from '@/types/finance';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface MonthlyOption {
    monthKey: string; // "2026-01"
    month: string;    // "Ene 2026"
}

interface MonthComparatorProps {
    transactions: Transaction[];
    monthlyOptions: MonthlyOption[];
    availableCategories: string[];
}

export const MonthComparator = ({
    transactions,
    monthlyOptions,
    availableCategories,
}: MonthComparatorProps) => {
    // Current date helpers for defaults
    const today = useMemo(() => new Date(), []);
    const currentMonthKey = useMemo(() => format(today, "yyyy-MM"), [today]);
    const previousMonthKey = useMemo(() => format(subMonths(today, 1), "yyyy-MM"), [today]);
    const todayDayNumber = useMemo(() => today.getDate(), [today]);

    // Defaults for month selection (Base = Mes Pasado, Comparado = Mes Actual)
    const defaultMonthA = useMemo(() => {
        return monthlyOptions.some(m => m.monthKey === previousMonthKey)
            ? previousMonthKey
            : (monthlyOptions[1]?.monthKey || monthlyOptions[0]?.monthKey || '');
    }, [monthlyOptions, previousMonthKey]);

    const defaultMonthB = useMemo(() => {
        return monthlyOptions.some(m => m.monthKey === currentMonthKey)
            ? currentMonthKey
            : (monthlyOptions[0]?.monthKey || '');
    }, [monthlyOptions, currentMonthKey]);

    // Select 2 months
    const [monthA, setMonthA] = useState<string>(defaultMonthA);
    const [monthB, setMonthB] = useState<string>(defaultMonthB);

    // Active Tab for comparison: 'expense' or 'income'
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

    // Filter states (default from day 1 to today's day)
    const [startDay, setStartDay] = useState<number>(1);
    const [endDay, setEndDay] = useState<number>(todayDayNumber);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
    // Separate excluded categories by type
    const [excludedExpenseCategories, setExcludedExpenseCategories] = useState<string[]>([]);
    const [excludedIncomeCategories, setExcludedIncomeCategories] = useState<string[]>([]);
    
    const [showCategoryFilter, setShowCategoryFilter] = useState<boolean>(false);
    const [catSearch, setCatSearch] = useState<string>('');

    const monthALabel = useMemo(() => {
        const option = monthlyOptions.find(m => m.monthKey === monthA);
        if (!option) return monthA;
        return option.month;
    }, [monthlyOptions, monthA]);

    const monthBLabel = useMemo(() => {
        const option = monthlyOptions.find(m => m.monthKey === monthB);
        if (!option) return monthB;
        return option.month;
    }, [monthlyOptions, monthB]);

    // Categories list filtered by search
    const filteredCategories = useMemo(() => {
        if (!catSearch.trim()) return availableCategories;
        return availableCategories.filter(cat =>
            cat.toLowerCase().includes(catSearch.toLowerCase())
        );
    }, [availableCategories, catSearch]);

    // Current active excluded categories depending on active tab
    const currentExcludedCategories = useMemo(() => {
        return activeTab === 'expense' ? excludedExpenseCategories : excludedIncomeCategories;
    }, [activeTab, excludedExpenseCategories, excludedIncomeCategories]);

    // Total active (non-excluded) income for Month A and Month B in selected date range
    const activeIncomeTotalA = useMemo(() => {
        const isTransfer = (category: string) => {
            const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized === 'transferencia';
        };

        return transactions
            .filter(t => 
                !t.isPending && 
                !isTransfer(t.category) && 
                t.type === 'income' && 
                !excludedIncomeCategories.includes(t.category) &&
                t.date.startsWith(monthA) && 
                parseISO(t.date).getDate() >= startDay && 
                parseISO(t.date).getDate() <= endDay
            )
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, monthA, startDay, endDay, excludedIncomeCategories]);

    const activeIncomeTotalB = useMemo(() => {
        const isTransfer = (category: string) => {
            const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized === 'transferencia';
        };

        return transactions
            .filter(t => 
                !t.isPending && 
                !isTransfer(t.category) && 
                t.type === 'income' && 
                !excludedIncomeCategories.includes(t.category) &&
                t.date.startsWith(monthB) && 
                parseISO(t.date).getDate() >= startDay && 
                parseISO(t.date).getDate() <= endDay
            )
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions, monthB, startDay, endDay, excludedIncomeCategories]);

    // Main comparison data computed for active tab
    const comparisonData = useMemo(() => {
        const isTransfer = (category: string) => {
            const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized === 'transferencia';
        };

        const filterTx = (t: Transaction, monthKey: string) => {
            if (t.isPending || isTransfer(t.category)) return false;
            if (t.type !== activeTab) return false;
            if (!t.date.startsWith(monthKey)) return false;

            const dateObj = parseISO(t.date);
            const day = dateObj.getDate();
            if (day < startDay || day > endDay) return false;

            if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) {
                return false;
            }

            return true;
        };

        const txsA = transactions.filter(t => filterTx(t, monthA));
        const txsB = transactions.filter(t => filterTx(t, monthB));

        // Group by category
        const mapA: Record<string, { amount: number; count: number }> = {};
        txsA.forEach(t => {
            if (!mapA[t.category]) mapA[t.category] = { amount: 0, count: 0 };
            mapA[t.category].amount += t.amount;
            mapA[t.category].count += 1;
        });

        const mapB: Record<string, { amount: number; count: number }> = {};
        txsB.forEach(t => {
            if (!mapB[t.category]) mapB[t.category] = { amount: 0, count: 0 };
            mapB[t.category].amount += t.amount;
            mapB[t.category].count += 1;
        });

        // Union of categories
        const categorySet = new Set<string>([
            ...Object.keys(mapA),
            ...Object.keys(mapB),
            ...(selectedCategories.length > 0 ? selectedCategories : [])
        ]);

        const rows = Array.from(categorySet).map(cat => {
            const amountA = mapA[cat]?.amount || 0;
            const countA = mapA[cat]?.count || 0;
            const amountB = mapB[cat]?.amount || 0;
            const countB = mapB[cat]?.count || 0;
            const diff = amountB - amountA;

            const pctIncomeA = (activeIncomeTotalA > 0 && amountA > 0) ? ((amountA / activeIncomeTotalA) * 100).toFixed(1) : null;
            const pctIncomeB = (activeIncomeTotalB > 0 && amountB > 0) ? ((amountB / activeIncomeTotalB) * 100).toFixed(1) : null;

            return {
                category: cat,
                amountA,
                countA,
                amountB,
                countB,
                diff,
                pctIncomeA,
                pctIncomeB,
                isExcluded: currentExcludedCategories.includes(cat)
            };
        })
        .filter(row => (row.amountA > 0 || row.amountB > 0) && !row.isExcluded);

        // Sort by highest total amount (A + B)
        rows.sort((a, b) => (b.amountA + b.amountB) - (a.amountA + a.amountB));

        const totalA = rows.reduce((sum, r) => sum + r.amountA, 0);
        const totalB = rows.reduce((sum, r) => sum + r.amountB, 0);
        const totalDiff = totalB - totalA;
        const totalCountA = rows.reduce((sum, r) => sum + r.countA, 0);
        const totalCountB = rows.reduce((sum, r) => sum + r.countB, 0);

        const totalPctIncomeA = (activeIncomeTotalA > 0 && totalA > 0) ? ((totalA / activeIncomeTotalA) * 100).toFixed(1) : null;
        const totalPctIncomeB = (activeIncomeTotalB > 0 && totalB > 0) ? ((totalB / activeIncomeTotalB) * 100).toFixed(1) : null;

        return {
            rows,
            totalA,
            totalB,
            totalDiff,
            totalCountA,
            totalCountB,
            totalPctIncomeA,
            totalPctIncomeB,
        };
    }, [transactions, monthA, monthB, startDay, endDay, activeTab, selectedCategories, currentExcludedCategories, activeIncomeTotalA, activeIncomeTotalB]);

    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleExcludeCategory = (category: string) => {
        if (activeTab === 'expense') {
            setExcludedExpenseCategories(prev => [...prev, category]);
        } else {
            setExcludedIncomeCategories(prev => [...prev, category]);
        }
    };

    const handleRestoreCategory = (category: string) => {
        if (activeTab === 'expense') {
            setExcludedExpenseCategories(prev => prev.filter(c => c !== category));
        } else {
            setExcludedIncomeCategories(prev => prev.filter(c => c !== category));
        }
    };

    const handleRestoreAllExcluded = () => {
        if (activeTab === 'expense') {
            setExcludedExpenseCategories([]);
        } else {
            setExcludedIncomeCategories([]);
        }
    };

    const handleClearCategories = () => {
        setSelectedCategories([]);
    };

    const handleDayRangePreset = (start: number, end: number) => {
        setStartDay(start);
        setEndDay(end);
    };

    if (monthlyOptions.length === 0) {
        return null;
    }

    return (
        <Card className="p-4 sm:p-6 overflow-hidden border-border/80 shadow-md">
            <CardHeader className="p-0 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <span className="truncate">Comparador por Meses</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                        {currentExcludedCategories.length > 0 && (
                            <Badge variant="destructive" className="text-xs font-semibold px-2 py-0.5">
                                {currentExcludedCategories.length} {activeTab === 'expense' ? 'gasto(s)' : 'ingreso(s)'} excluido(s)
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-muted/40">
                            {activeTab === 'expense' ? 'Gastos' : 'Ingresos'} | Días {startDay}-{endDay}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
                {/* Controls & Selectors Grid */}
                <div className="bg-muted/30 p-3 sm:p-4 rounded-xl border border-border/50 space-y-4">
                    {/* Row 1: Months selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                Mes A (Base)
                            </label>
                            <Select value={monthA} onValueChange={setMonthA}>
                                <SelectTrigger className="w-full bg-background font-semibold">
                                    <SelectValue placeholder="Selecciona Mes A" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthlyOptions.map(m => (
                                        <SelectItem key={m.monthKey} value={m.monthKey} className="capitalize">
                                            {m.month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                Mes B (Comparado)
                            </label>
                            <Select value={monthB} onValueChange={setMonthB}>
                                <SelectTrigger className="w-full bg-background font-semibold">
                                    <SelectValue placeholder="Selecciona Mes B" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthlyOptions.map(m => (
                                        <SelectItem key={m.monthKey} value={m.monthKey} className="capitalize">
                                            {m.month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Days range filter & presets */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                Rango de días del mes
                            </label>
                            {/* Presets */}
                            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant={startDay === 1 && endDay === todayDayNumber ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-[11px] px-2.5 rounded-full flex-1 sm:flex-none font-bold"
                                    onClick={() => handleDayRangePreset(1, todayDayNumber)}
                                >
                                    Día 1 a hoy ({todayDayNumber})
                                </Button>
                                <Button
                                    type="button"
                                    variant={startDay === 1 && endDay === 31 ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-[11px] px-2.5 rounded-full flex-1 sm:flex-none"
                                    onClick={() => handleDayRangePreset(1, 31)}
                                >
                                    Mes completo
                                </Button>
                                <Button
                                    type="button"
                                    variant={startDay === 1 && endDay === 10 ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-[11px] px-2.5 rounded-full flex-1 sm:flex-none"
                                    onClick={() => handleDayRangePreset(1, 10)}
                                >
                                    Días 1-10
                                </Button>
                                <Button
                                    type="button"
                                    variant={startDay === 1 && endDay === 15 ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-[11px] px-2.5 rounded-full flex-1 sm:flex-none"
                                    onClick={() => handleDayRangePreset(1, 15)}
                                >
                                    Días 1-15
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 max-w-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Desde:</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={startDay}
                                    onChange={(e) => setStartDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                    className="h-8 text-xs bg-background font-bold text-center"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hasta:</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={endDay}
                                    onChange={(e) => setEndDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 31)))}
                                    className="h-8 text-xs bg-background font-bold text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Category Filter toggle button */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/40">
                        <Button
                            type="button"
                            variant={selectedCategories.length > 0 ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs gap-1.5 font-semibold"
                            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {selectedCategories.length === 0
                                ? "Filtrar Categorías"
                                : `${selectedCategories.length} filtrada(s)`}
                        </Button>
                    </div>

                    {/* Category Filter Drawer/Box */}
                    {showCategoryFilter && (
                        <div className="bg-background p-3 rounded-lg border border-border space-y-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Categorías Disponibles</span>
                                {selectedCategories.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                                        onClick={handleClearCategories}
                                    >
                                        Limpiar ({selectedCategories.length})
                                    </Button>
                                )}
                            </div>

                            <Input
                                type="text"
                                placeholder="Buscar categoría..."
                                value={catSearch}
                                onChange={(e) => setCatSearch(e.target.value)}
                                className="h-8 text-xs"
                            />

                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                {filteredCategories.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2">No se encontraron categorías.</p>
                                ) : (
                                    filteredCategories.map((cat) => {
                                        const isSelected = selectedCategories.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleCategoryToggle(cat)}
                                                className={cn(
                                                    "text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-medium",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                        : "bg-muted/50 hover:bg-muted text-muted-foreground border-border/60"
                                                )}
                                            >
                                                {isSelected && <Check className="w-3 h-3 shrink-0" />}
                                                <span>{cat}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Excluded categories indicator banner */}
                {currentExcludedCategories.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <EyeOff className="w-4 h-4 shrink-0" />
                                {currentExcludedCategories.length} {activeTab === 'expense' ? 'gasto(s)' : 'ingreso(s)'} excluido(s):
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {currentExcludedCategories.map(cat => (
                                    <span
                                        key={cat}
                                        className="bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer"
                                        onClick={() => handleRestoreCategory(cat)}
                                        title="Hacer clic para restaurar esta categoría"
                                    >
                                        {cat}
                                        <X className="w-3 h-3" />
                                    </span>
                                ))}
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 gap-1 shrink-0"
                            onClick={handleRestoreAllExcluded}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurar todas
                        </Button>
                    </div>
                )}

                {/* --- TABS FOR GASTOS / INGRESOS --- */}
                <div className="flex border-b border-border gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('expense')}
                        className={cn(
                            "px-5 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 rounded-t-lg",
                            activeTab === 'expense'
                                ? "border-expense text-expense bg-expense/10"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <TrendingDown className="w-4 h-4" />
                        Gastos
                        {excludedExpenseCategories.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('income')}
                        className={cn(
                            "px-5 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 rounded-t-lg",
                            activeTab === 'income'
                                ? "border-income text-income bg-income/10"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Ingresos
                        {excludedIncomeCategories.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                    </button>
                </div>

                {/* Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Month A Total */}
                    <div className="p-3.5 sm:p-4 bg-muted/40 rounded-xl border border-border/60 flex flex-col justify-between">
                        <div>
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                                {monthALabel} (días {startDay}-{endDay})
                            </span>
                            <p className="text-xl font-extrabold text-foreground">
                                {formatCurrency(comparisonData.totalA)}
                            </p>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground font-medium space-y-0.5">
                            <div>{comparisonData.totalCountA} transacción(es)</div>
                            {activeTab === 'expense' && (
                                <div className="text-income font-bold flex items-center gap-1">
                                    <Wallet className="w-3 h-3" />
                                    Ingresos considerados: {formatCurrency(activeIncomeTotalA)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Month B Total */}
                    <div className="p-3.5 sm:p-4 bg-muted/40 rounded-xl border border-border/60 flex flex-col justify-between">
                        <div>
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                                {monthBLabel} (días {startDay}-{endDay})
                            </span>
                            <p className="text-xl font-extrabold text-foreground">
                                {formatCurrency(comparisonData.totalB)}
                            </p>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground font-medium space-y-0.5">
                            <div>{comparisonData.totalCountB} transacción(es)</div>
                            {activeTab === 'expense' && (
                                <div className="text-income font-bold flex items-center gap-1">
                                    <Wallet className="w-3 h-3" />
                                    Ingresos considerados: {formatCurrency(activeIncomeTotalB)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Total Variation */}
                    <div className={cn(
                        "p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all",
                        activeTab === 'expense'
                            ? comparisonData.totalDiff > 0
                                ? "bg-expense/10 border-expense/30 text-expense"
                                : comparisonData.totalDiff < 0
                                    ? "bg-income/10 border-income/30 text-income"
                                    : "bg-muted/40 border-border/60"
                            : comparisonData.totalDiff > 0
                                ? "bg-income/10 border-income/30 text-income"
                                : comparisonData.totalDiff < 0
                                    ? "bg-expense/10 border-expense/30 text-expense"
                                    : "bg-muted/40 border-border/60"
                    )}>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-80">
                                Diferencia (Mes B vs A)
                            </span>
                            <div className="flex items-center gap-2">
                                {comparisonData.totalDiff > 0 ? (
                                    <TrendingUp className="w-5 h-5 shrink-0" />
                                ) : comparisonData.totalDiff < 0 ? (
                                    <TrendingDown className="w-5 h-5 shrink-0" />
                                ) : (
                                    <Minus className="w-5 h-5 shrink-0" />
                                )}
                                <p className="text-xl font-extrabold">
                                    {comparisonData.totalDiff > 0 ? '+' : ''}{formatCurrency(comparisonData.totalDiff)}
                                </p>
                            </div>
                        </div>
                        <span className="text-[11px] font-bold mt-1.5 opacity-90">
                            {comparisonData.totalA > 0 
                                ? `${(comparisonData.totalDiff >= 0 ? '+' : '')}${((comparisonData.totalDiff / comparisonData.totalA) * 100).toFixed(1)}% respecto a ${monthALabel}`
                                : 'Sin base de comparación'}
                        </span>
                    </div>
                </div>

                {/* Main Comparison Section */}
                <div className="border border-border rounded-xl overflow-hidden shadow-xs">
                    {comparisonData.rows.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground space-y-2">
                            <Layers className="w-8 h-8 mx-auto opacity-50 mb-2" />
                            <p className="font-semibold text-sm">No se encontraron {activeTab === 'expense' ? 'gastos' : 'ingresos'} con los filtros aplicados.</p>
                            <p className="text-xs">Prueba ampliando el rango de días o restaurando categorías excluidas.</p>
                        </div>
                    ) : (
                        <div>
                            {/* --- MOBILE CARDS VIEW (Visible on screens smaller than sm) --- */}
                            <div className="block md:hidden divide-y divide-border/60">
                                {comparisonData.rows.map((row) => {
                                    const isHigherInB = row.diff > 0;
                                    const isLowerInB = row.diff < 0;

                                    let diffBadgeClass = "text-muted-foreground bg-muted";
                                    if (activeTab === 'expense') {
                                        if (isHigherInB) diffBadgeClass = "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400";
                                        if (isLowerInB) diffBadgeClass = "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400";
                                    } else {
                                        if (isHigherInB) diffBadgeClass = "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400";
                                        if (isLowerInB) diffBadgeClass = "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400";
                                    }

                                    return (
                                        <div key={row.category} className="p-3.5 bg-background space-y-2">
                                            {/* Header of Item: Category + Difference Badge + Delete */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold capitalize text-sm text-foreground">
                                                    {row.category}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={cn("text-xs font-bold px-2 py-0.5 border-0", diffBadgeClass)}>
                                                        {row.diff > 0 ? '+' : ''}{formatCurrency(row.diff)}
                                                    </Badge>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                        title={`Excluir "${row.category}"`}
                                                        onClick={() => handleExcludeCategory(row.category)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Grid comparing Month A and Month B */}
                                            <div className="grid grid-cols-2 gap-2 pt-1 bg-muted/20 p-2 rounded-lg border border-border/40 text-xs">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block truncate">
                                                        {monthALabel}
                                                    </span>
                                                    <span className={cn("font-bold text-sm", row.amountA > 0 ? "text-foreground" : "text-muted-foreground")}>
                                                        {row.amountA > 0 ? formatCurrency(row.amountA) : '-'}
                                                    </span>
                                                    {row.countA > 0 && (
                                                        <span className="text-[10px] text-muted-foreground ml-1">
                                                            ({row.countA} tx)
                                                        </span>
                                                    )}
                                                    {row.pctIncomeA && activeTab === 'expense' && (
                                                        <span className="block text-[10px] text-muted-foreground font-semibold">
                                                            {row.pctIncomeA}% de ingresos
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="border-l border-border/40 pl-2">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block truncate">
                                                        {monthBLabel}
                                                    </span>
                                                    <span className={cn("font-bold text-sm", row.amountB > 0 ? "text-foreground" : "text-muted-foreground")}>
                                                        {row.amountB > 0 ? formatCurrency(row.amountB) : '-'}
                                                    </span>
                                                    {row.countB > 0 && (
                                                        <span className="text-[10px] text-muted-foreground ml-1">
                                                            ({row.countB} tx)
                                                        </span>
                                                    )}
                                                    {row.pctIncomeB && activeTab === 'expense' && (
                                                        <span className="block text-[10px] text-muted-foreground font-semibold">
                                                            {row.pctIncomeB}% de ingresos
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Mobile Totals Footer */}
                                <div className="p-4 bg-muted/60 border-t-2 border-border space-y-2 text-xs font-bold">
                                    <div className="flex justify-between items-center text-muted-foreground uppercase tracking-wider text-[11px]">
                                        <span>TOTAL MESES</span>
                                        <span>DIFERENCIA TOTAL</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex gap-4">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground block">{monthALabel}</span>
                                                <span>{formatCurrency(comparisonData.totalA)}</span>
                                                {comparisonData.totalPctIncomeA && activeTab === 'expense' && (
                                                    <span className="block text-[10px] text-muted-foreground font-semibold">
                                                        ({comparisonData.totalPctIncomeA}% ing.)
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground block">{monthBLabel}</span>
                                                <span>{formatCurrency(comparisonData.totalB)}</span>
                                                {comparisonData.totalPctIncomeB && activeTab === 'expense' && (
                                                    <span className="block text-[10px] text-muted-foreground font-semibold">
                                                        ({comparisonData.totalPctIncomeB}% ing.)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-base font-extrabold",
                                            activeTab === 'expense'
                                                ? comparisonData.totalDiff > 0 ? "text-red-500" : comparisonData.totalDiff < 0 ? "text-emerald-500" : ""
                                                : comparisonData.totalDiff > 0 ? "text-emerald-500" : comparisonData.totalDiff < 0 ? "text-red-500" : ""
                                        )}>
                                            {comparisonData.totalDiff > 0 ? '+' : ''}{formatCurrency(comparisonData.totalDiff)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* --- DESKTOP TABLE VIEW (Visible on screens md and up) --- */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-muted/60 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <th className="py-3 px-4">Categoría</th>
                                            <th className="py-3 px-4 text-right">{monthALabel}</th>
                                            <th className="py-3 px-4 text-right">{monthBLabel}</th>
                                            <th className="py-3 px-4 text-right">Diferencia</th>
                                            <th className="py-3 px-2 text-center w-10" title="Acciones"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 bg-background font-medium">
                                        {comparisonData.rows.map((row) => {
                                            const isHigherInB = row.diff > 0;
                                            const isLowerInB = row.diff < 0;

                                            let diffBadgeClass = "text-muted-foreground bg-muted";
                                            if (activeTab === 'expense') {
                                                if (isHigherInB) diffBadgeClass = "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400";
                                                if (isLowerInB) diffBadgeClass = "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400";
                                            } else {
                                                if (isHigherInB) diffBadgeClass = "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400";
                                                if (isLowerInB) diffBadgeClass = "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400";
                                            }

                                            return (
                                                <tr key={row.category} className="hover:bg-muted/30 transition-colors group">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold capitalize">{row.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <span className={cn(row.amountA > 0 ? "font-bold text-foreground" : "text-muted-foreground text-xs")}>
                                                            {row.amountA > 0 ? formatCurrency(row.amountA) : '-'}
                                                        </span>
                                                        {row.countA > 0 && (
                                                            <span className="block text-[10px] text-muted-foreground">
                                                                ({row.countA} tx)
                                                            </span>
                                                        )}
                                                        {row.pctIncomeA && activeTab === 'expense' && (
                                                            <span className="block text-[10px] text-muted-foreground font-semibold">
                                                                {row.pctIncomeA}% de ing.
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <span className={cn(row.amountB > 0 ? "font-bold text-foreground" : "text-muted-foreground text-xs")}>
                                                            {row.amountB > 0 ? formatCurrency(row.amountB) : '-'}
                                                        </span>
                                                        {row.countB > 0 && (
                                                            <span className="block text-[10px] text-muted-foreground">
                                                                ({row.countB} tx)
                                                            </span>
                                                        )}
                                                        {row.pctIncomeB && activeTab === 'expense' && (
                                                            <span className="block text-[10px] text-muted-foreground font-semibold">
                                                                {row.pctIncomeB}% de ing.
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <Badge className={cn("text-xs font-bold px-2 py-0.5 border-0", diffBadgeClass)}>
                                                            {row.diff > 0 ? '+' : ''}{formatCurrency(row.diff)}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100 transition-opacity"
                                                            title={`Excluir "${row.category}" de los totales`}
                                                            onClick={() => handleExcludeCategory(row.category)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/50 border-t-2 border-border font-extrabold text-sm">
                                            <td className="py-3.5 px-4 uppercase text-xs tracking-wider text-muted-foreground">
                                                TOTAL
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <span>{formatCurrency(comparisonData.totalA)}</span>
                                                {comparisonData.totalPctIncomeA && activeTab === 'expense' && (
                                                    <span className="block text-[10px] text-muted-foreground font-bold">
                                                        ({comparisonData.totalPctIncomeA}% de ingresos)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <span>{formatCurrency(comparisonData.totalB)}</span>
                                                {comparisonData.totalPctIncomeB && activeTab === 'expense' && (
                                                    <span className="block text-[10px] text-muted-foreground font-bold">
                                                        ({comparisonData.totalPctIncomeB}% de ingresos)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <span className={cn(
                                                    "font-extrabold",
                                                    activeTab === 'expense'
                                                        ? comparisonData.totalDiff > 0 ? "text-red-500" : comparisonData.totalDiff < 0 ? "text-emerald-500" : ""
                                                        : comparisonData.totalDiff > 0 ? "text-emerald-500" : comparisonData.totalDiff < 0 ? "text-red-500" : ""
                                                )}>
                                                    {comparisonData.totalDiff > 0 ? '+' : ''}{formatCurrency(comparisonData.totalDiff)}
                                                </span>
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
