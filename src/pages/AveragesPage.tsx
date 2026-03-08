import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/finance';
import { loadData } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import ThemeToggle from '@/components/ThemeToggle';
import MobileNav from '@/components/MobileNav';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts';

interface CategoryAverage {
    category: string;
    average: number;
}

const AveragesPage = () => {
    const navigate = useNavigate();
    const [data] = useState(loadData());

    const { expenseAverages, incomeAverages } = useMemo(() => {
        const expensesByCategory: Record<string, Record<string, number>> = {};
        const incomesByCategory: Record<string, Record<string, number>> = {};

        data.transactions
            .filter(t => !t.isPending && t.category !== 'Transferencia')
            .forEach(transaction => {
                const target = transaction.type === 'expense' ? expensesByCategory : incomesByCategory;
                const monthKey = transaction.date.substring(0, 7);

                if (!target[transaction.category]) target[transaction.category] = {};
                if (!target[transaction.category][monthKey]) target[transaction.category][monthKey] = 0;
                target[transaction.category][monthKey] += transaction.amount;
            });

        const calculateAverages = (grouped: Record<string, Record<string, number>>): CategoryAverage[] => {
            return Object.entries(grouped)
                .map(([category, monthlyTotals]) => {
                    const months = Object.keys(monthlyTotals);
                    const total = Object.values(monthlyTotals).reduce((sum, a) => sum + a, 0);
                    return {
                        category,
                        average: Math.round(total / months.length),
                    };
                })
                .sort((a, b) => b.average - a.average);
        };

        return {
            expenseAverages: calculateAverages(expensesByCategory),
            incomeAverages: calculateAverages(incomesByCategory),
        };
    }, [data.transactions]);

    const hasData = expenseAverages.length > 0 || incomeAverages.length > 0;
    const getChartHeight = (count: number) => Math.max(200, count * 45);

    return (
        <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20">
            <div className="container max-w-3xl mx-auto px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div className="p-2 bg-primary rounded-lg">
                                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Medias</h1>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 px-11">
                        Gasto e ingreso medio mensual por categoría basado en tu histórico.
                    </p>
                </div>

                {!hasData ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground">No hay suficientes datos para calcular medias.</p>
                    </div>
                ) : (
                    <div className="space-y-8 pb-10">
                        {/* Info Card */}
                        <Card className="bg-primary/5 border-primary/10">
                            <CardContent className="p-4 flex gap-3 items-start">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-primary/80 leading-relaxed">
                                    Estos valores se calculan dividiendo el total gastado en cada categoría por el número de meses en los que ha habido actividad. Se excluyen transacciones previstas y transferencias.
                                </p>
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
                                <CardContent className="p-6">
                                    <div style={{ height: getChartHeight(expenseAverages.length) }} className="w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={expenseAverages}
                                                layout="vertical"
                                                margin={{ top: 5, right: 100, left: 10, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted/30" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    type="category"
                                                    dataKey="category"
                                                    width={110}
                                                    tick={{ fontSize: 13, fontWeight: 500 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Bar dataKey="average" radius={[0, 6, 6, 0]} barSize={28}>
                                                    {expenseAverages.map((_, index) => (
                                                        <Cell key={`expense-${index}`} fill="hsl(25, 95%, 53%)" className="opacity-90 hover:opacity-100 transition-opacity" />
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
                                <CardContent className="p-6">
                                    <div style={{ height: getChartHeight(incomeAverages.length) }} className="w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={incomeAverages}
                                                layout="vertical"
                                                margin={{ top: 5, right: 100, left: 10, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted/30" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    type="category"
                                                    dataKey="category"
                                                    width={110}
                                                    tick={{ fontSize: 13, fontWeight: 500 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Bar dataKey="average" radius={[0, 6, 6, 0]} barSize={28}>
                                                    {incomeAverages.map((_, index) => (
                                                        <Cell key={`income-${index}`} fill="hsl(142, 76%, 36%)" className="opacity-90 hover:opacity-100 transition-opacity" />
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
