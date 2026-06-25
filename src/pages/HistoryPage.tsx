/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Transaction } from '@/types/finance';
import { loadData } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import MobileNav from '@/components/MobileNav';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';

interface MonthlyData {
    month: string;
    monthKey: string;
    income: number;
    expenses: number;
}

const HistoryPage = () => {
    const navigate = useNavigate();
    const [data] = useState(loadData());
    const [selectedChartMonth, setSelectedChartMonth] = useState<{ monthKey: string, monthName: string } | null>(null);

    const monthlyData: MonthlyData[] = useMemo(() => {
        const monthMap = new Map<string, Transaction[]>();

        const isTransfer = (category: string) => {
            const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized === 'transferencia';
        };

        data.transactions.forEach(transaction => {
            if (isTransfer(transaction.category) || transaction.isPending) return;

            const date = parseISO(transaction.date);
            const monthKey = format(startOfMonth(date), 'yyyy-MM');

            const existing = monthMap.get(monthKey) || [];
            existing.push(transaction);
            monthMap.set(monthKey, existing);
        });

        return Array.from(monthMap.entries())
            .map(([monthKey, transactions]) => ({
                month: format(parseISO(monthKey + '-01'), 'MMM yyyy', { locale: es }),
                monthKey,
                income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                expenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            }))
            .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    }, [data.transactions]);

    const handleMonthClick = (monthKey: string) => {
        navigate(`/?month=${monthKey}`);
    };

    const handleBarClick = (data: any) => {
        if (data && data.monthKey) {
            setSelectedChartMonth({ monthKey: data.monthKey, monthName: data.month });
        }
    };

    const chartDetailsData = useMemo(() => {
        if (!selectedChartMonth) return null;
        
        const isTransfer = (category: string) => {
            const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized === 'transferencia';
        };

        const monthTransactions = data.transactions.filter(t => 
            t.date.startsWith(selectedChartMonth.monthKey) && 
            !t.isPending &&
            !isTransfer(t.category)
        );

        const incomeColors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
        const expenseColors = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];

        const getTop5AndOthers = (type: 'income' | 'expense') => {
            const summary: Record<string, number> = {};
            monthTransactions.filter(t => t.type === type).forEach(t => {
                summary[t.category] = (summary[t.category] || 0) + t.amount;
            });

            const colors = type === 'income' ? incomeColors : expenseColors;

            const sorted = Object.entries(summary)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount], index) => {
                    return {
                        category,
                        amount,
                        fill: index < 5 ? colors[index] : '#94a3b8'
                    };
                });

            const top5 = sorted.slice(0, 5);
            const othersAmount = sorted.slice(5).reduce((sum, item) => sum + item.amount, 0);

            if (othersAmount > 0) {
                top5.push({ category: 'Otros', amount: othersAmount, fill: '#94a3b8' });
            }
            return top5;
        };

        const incomeData = getTop5AndOthers('income');
        const expenseData = getTop5AndOthers('expense');

        const chartDataObj: any = { name: selectedChartMonth.monthName };
        
        incomeData.forEach((item, index) => {
            chartDataObj[`income_${index}`] = item.amount;
        });
        expenseData.forEach((item, index) => {
            chartDataObj[`expense_${index}`] = item.amount;
        });

        return {
            chartData: [chartDataObj],
            incomeData,
            expenseData
        };
    }, [selectedChartMonth, data.transactions]);

    const chartConfig = {
        income: {
            label: 'Ingresos',
            color: 'hsl(142, 76%, 36%)',
        },
        expenses: {
            label: 'Gastos',
            color: 'hsl(25, 95%, 53%)',
        },
    };

    return (
        <div className="w-full">
            <div className="w-full max-w-6xl mx-auto px-4 lg:px-12 py-4 sm:py-6">
                {monthlyData.length === 0 ? (
                    <div className="text-center py-20">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No hay transacciones registradas todavía.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Chart */}
                        <Card className="p-4 sm:p-6 overflow-hidden">
                            <h2 className="text-lg font-semibold mb-6">Comparativa Mensual</h2>
                            <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[...monthlyData].reverse()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 10 }}
                                            className="text-muted-foreground"
                                            interval={0}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(value) => `${value}€`}
                                            className="text-muted-foreground"
                                            width={50}
                                        />
                                        <Tooltip
                                            content={<ChartTooltipContent />}
                                            formatter={(value: number) => formatCurrency(value)}
                                            isAnimationActive={false}
                                            animationDuration={0}
                                        />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar
                                            dataKey="income"
                                            name="Ingresos"
                                            fill="hsl(142, 76%, 36%)"
                                            radius={[4, 4, 0, 0]}
                                            isAnimationActive={false}
                                            animationDuration={0}
                                            onClick={(data) => handleBarClick(data)}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                        />
                                        <Bar
                                            dataKey="expenses"
                                            name="Gastos"
                                            fill="hsl(25, 95%, 53%)"
                                            radius={[4, 4, 0, 0]}
                                            isAnimationActive={false}
                                            animationDuration={0}
                                            onClick={(data) => handleBarClick(data)}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Card>

                        {/* List */}
                        <div className="space-y-3 pb-8">
                            <h2 className="text-lg font-semibold px-1">Detalle por Mes</h2>
                            {monthlyData.map((data) => (
                                <button
                                    key={data.monthKey}
                                    onClick={() => handleMonthClick(data.monthKey)}
                                    className="w-full text-left transition-transform active:scale-[0.98]"
                                >
                                    <Card className="hover:bg-accent/50 transition-colors border-none shadow-sm">
                                        <CardContent className="p-4 sm:p-5">
                                            <div className="flex justify-between items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/5 rounded-full">
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="font-bold capitalize text-lg">{data.month}</span>
                                                </div>
                                                <div className="flex gap-4 text-sm sm:text-base whitespace-nowrap">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Ingresos</span>
                                                        <span className="text-income font-bold">+{formatCurrency(data.income)}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Gastos</span>
                                                        <span className="text-expense font-bold">-{formatCurrency(data.expenses)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Detalle de Barras */}
            {selectedChartMonth && chartDetailsData && (
                <ResponsiveDialog 
                    open={!!selectedChartMonth} 
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedChartMonth(null);
                        }
                    }}
                >
                    <ResponsiveDialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                        <ResponsiveDialogHeader className="px-6 pt-6 pb-2 shrink-0">
                            <ResponsiveDialogTitle className="text-xl flex flex-col">
                                <span className="capitalize">{selectedChartMonth.monthName}</span>
                                <span className="text-sm font-bold text-muted-foreground">
                                    Desglose de Ingresos y Gastos (Top 5)
                                </span>
                            </ResponsiveDialogTitle>
                        </ResponsiveDialogHeader>
                        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                            <div className="flex flex-col sm:flex-row gap-6 mt-4 items-start">
                                <div className="h-[350px] w-full sm:flex-1 sm:min-w-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={chartDetailsData.chartData} 
                                            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                                            barSize={40}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tickFormatter={(val) => `${val}€`} tick={{ fontSize: 10 }} />
                                            <Tooltip 
                                                formatter={(value: number, name: string) => [formatCurrency(value), name.split(': ')[1]]}
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                            {chartDetailsData.incomeData.map((item, index) => (
                                                <Bar 
                                                    key={`inc-${index}`} 
                                                    dataKey={`income_${index}`} 
                                                    name={`Ingreso: ${item.category}`} 
                                                    stackId="income" 
                                                    fill={item.fill} 
                                                    isAnimationActive={false}
                                                />
                                            ))}
                                            {chartDetailsData.expenseData.map((item, index) => (
                                                <Bar 
                                                    key={`exp-${index}`} 
                                                    dataKey={`expense_${index}`} 
                                                    name={`Gasto: ${item.category}`} 
                                                    stackId="expense" 
                                                    fill={item.fill} 
                                                    isAnimationActive={false}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full sm:w-[250px] flex flex-col gap-6">
                                    {chartDetailsData.incomeData.length > 0 && (
                                        <div>
                                            <h3 className="font-bold text-income mb-2 border-b border-border/50 pb-1">Top Ingresos</h3>
                                            <div className="space-y-1.5 mt-2">
                                                {chartDetailsData.incomeData.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                                                            <span className="truncate max-w-[120px] capitalize text-muted-foreground">{item.category}</span>
                                                        </div>
                                                        <span className="font-bold">{formatCurrency(item.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {chartDetailsData.expenseData.length > 0 && (
                                        <div>
                                            <h3 className="font-bold text-expense mb-2 border-b border-border/50 pb-1">Top Gastos</h3>
                                            <div className="space-y-1.5 mt-2">
                                                {chartDetailsData.expenseData.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                                                            <span className="truncate max-w-[120px] capitalize text-muted-foreground">{item.category}</span>
                                                        </div>
                                                        <span className="font-bold">{formatCurrency(item.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ResponsiveDialogContent>
                </ResponsiveDialog>
            )}

            <MobileNav />
        </div>
    );
};

export default HistoryPage;
