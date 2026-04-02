import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/finance';
import { loadData } from '@/lib/storage';
import { formatCurrency, calculateMonthlyAverages, CategoryMonthlyAverage } from '@/lib/calculations';
import MobileNav from '@/components/MobileNav';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';

const STORAGE_KEY = 'contahogar_selected_averages';

const AveragesPage = () => {
    const navigate = useNavigate();
    const [data] = useState(loadData());

    const { expenseAverages, incomeAverages } = useMemo(() => {
        const allAverages = calculateMonthlyAverages(data.transactions);
        
        return {
            expenseAverages: allAverages.filter(a => a.type === 'expense'),
            incomeAverages: allAverages.filter(a => a.type === 'income'),
        };
    }, [data.transactions]);


    const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from storage and set defaults for new categories
    useEffect(() => {
        if (expenseAverages.length === 0 && incomeAverages.length === 0) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        let selections: Record<string, boolean> = {};
        if (saved) {
            try {
                selections = JSON.parse(saved);
            } catch (e) {}
        }

        const initial: Record<string, boolean> = { ...selections };
        let updated = false;

        [...expenseAverages, ...incomeAverages].forEach(a => {
            if (!(a.category in initial)) {
                initial[a.category] = a.isRegular;
                updated = true;
            }
        });

        if (!isInitialized || updated) {
            setSelectedCategories(initial);
            setIsInitialized(true);
        }
    }, [expenseAverages, incomeAverages, isInitialized]);

    // Save to storage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCategories));
        }
    }, [selectedCategories, isInitialized]);

    const dynamicTotalExpenses = useMemo(() => {
        let total = 0;
        expenseAverages.forEach(a => {
            if (selectedCategories[a.category]) total += a.average;
        });
        return total;
    }, [expenseAverages, selectedCategories]);

    const dynamicTotalIncomes = useMemo(() => {
        let total = 0;
        incomeAverages.forEach(a => {
            if (selectedCategories[a.category]) total += a.average;
        });
        return total;
    }, [incomeAverages, selectedCategories]);

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    const hasData = expenseAverages.length > 0 || incomeAverages.length > 0;
    const getChartHeight = (count: number) => Math.max(200, count * 45);

    const CustomYAxisTick = (props: any) => {
        const { x, y, payload } = props;
        const category = payload.value;
        const isChecked = selectedCategories[category];

        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x="-140" y="-12" width="140" height="24" style={{ overflow: 'visible' }}>
                    <div 
                        className="flex items-center gap-2 h-full pr-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(category);
                        }}
                    >
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleCategory(category)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                        />
                        <span 
                            className={`text-[13px] font-medium truncate cursor-pointer ${!isChecked ? 'opacity-40 text-muted-foreground' : ''}`}
                            title={capitalize(category)}
                        >
                            {capitalize(category)}
                        </span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20 pt-24">
            <div className="container max-w-3xl mx-auto px-4 py-4 sm:py-6">
                {!hasData ? (
                    <div className="text-center py-20 bg-card/50 rounded-2xl border border-dashed border-border">
                        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground">No hay suficientes datos para calcular medias.</p>
                    </div>
                ) : (
                    <div className="space-y-8 pb-10">
                        {/* Summary Card */}
                        <Card className="bg-foreground text-background shadow-xl border-none overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <BarChart3 className="w-24 h-24" />
                            </div>
                            <CardContent className="p-6 sm:p-8 relative z-10">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs sm:text-sm uppercase font-bold tracking-[0.2em] opacity-50">Balance Medio Estimado</p>
                                        <h2 className={`text-4xl sm:text-5xl font-black tracking-tighter ${dynamicTotalIncomes - dynamicTotalExpenses >= 0 ? 'text-income' : 'text-expense'}`}>
                                            {formatCurrency(dynamicTotalIncomes - dynamicTotalExpenses)}
                                        </h2>
                                    </div>
                                    <div className="flex gap-8 sm:gap-12 md:pb-1">
                                        <div className="space-y-1">
                                            <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest opacity-40">Gastos</p>
                                            <p className="text-xl sm:text-2xl font-bold text-expense/90">{formatCurrency(dynamicTotalExpenses)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest opacity-40">Ingresos</p>
                                            <p className="text-xl sm:text-2xl font-bold text-income/90">{formatCurrency(dynamicTotalIncomes)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card className="bg-primary/5 border-primary/10">
                            <CardContent className="p-4 flex gap-3 items-start">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-xs sm:text-sm text-primary/80 leading-relaxed">
                                        Selecciona qué categorías incluir en el balance superior. La media es mensual, calculada dividiendo el total entre los meses con actividad.
                                    </p>
                                    <p className="text-xs sm:text-sm text-primary/80 leading-relaxed">
                                        Las categorías con actividad en <strong>al menos 3 meses</strong> están marcadas por defecto.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expense Averages */}
                        {expenseAverages.length > 0 && (
                            <Card className="overflow-hidden border-none shadow-sm">
                                <CardHeader className="bg-expense/5 pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2 text-expense">
                                        <TrendingDown className="w-5 h-5" />
                                        Media Mensual de Gastos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-6">
                                        <div style={{ height: getChartHeight(expenseAverages.length) }} className="w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={expenseAverages}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 100, left: 40, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted/30" />
                                                    <XAxis type="number" hide />
                                                    <YAxis
                                                        type="category"
                                                        dataKey="category"
                                                        width={140}
                                                        tick={<CustomYAxisTick />}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <Bar dataKey="average" radius={[0, 6, 6, 0]} barSize={28} onClick={(data) => toggleCategory(data.category)}>
                                                        {expenseAverages.map((a, index) => (
                                                            <Cell 
                                                                key={`expense-${index}`} 
                                                                fill="hsl(25, 95%, 53%)" 
                                                                className={`transition-opacity ${selectedCategories[a.category] ? 'opacity-90 hover:opacity-100' : 'opacity-20'}`} 
                                                            />
                                                        ))}
                                                        <LabelList
                                                            dataKey="average"
                                                            position="right"
                                                            formatter={(value: number) => formatCurrency(value)}
                                                            style={{ fontSize: 14, fontWeight: 'bold', fill: 'hsl(var(--foreground))' }}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Income Averages */}
                        {incomeAverages.length > 0 && (
                            <Card className="overflow-hidden border-none shadow-sm">
                                <CardHeader className="bg-income/5 pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2 text-income">
                                        <TrendingUp className="w-5 h-5" />
                                        Media Mensual de Ingresos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-6">
                                        <div style={{ height: getChartHeight(incomeAverages.length) }} className="w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={incomeAverages}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 100, left: 40, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted/30" />
                                                    <XAxis type="number" hide />
                                                    <YAxis
                                                        type="category"
                                                        dataKey="category"
                                                        width={140}
                                                        tick={<CustomYAxisTick />}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <Bar dataKey="average" radius={[0, 6, 6, 0]} barSize={28} onClick={(data) => toggleCategory(data.category)}>
                                                        {incomeAverages.map((a, index) => (
                                                            <Cell 
                                                                key={`income-${index}`} 
                                                                fill="hsl(142, 76%, 36%)" 
                                                                className={`transition-opacity ${selectedCategories[a.category] ? 'opacity-90 hover:opacity-100' : 'opacity-20'}`} 
                                                            />
                                                        ))}
                                                        <LabelList
                                                            dataKey="average"
                                                            position="right"
                                                            formatter={(value: number) => formatCurrency(value)}
                                                            style={{ fontSize: 14, fontWeight: 'bold', fill: 'hsl(var(--foreground))' }}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
            <MobileNav />
        </div>
    );
};

export default AveragesPage;
