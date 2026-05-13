import { useState, useMemo } from 'react';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface MonthlyData {
    month: string;
    monthKey: string;
    income: number;
    expenses: number;
}

const HistoryPage = () => {
    const navigate = useNavigate();
    const [data] = useState(loadData());

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
        <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20 pt-24">
            <div className="container max-w-4xl mx-auto px-4 py-4 sm:py-6">
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
                                        />
                                        <Bar
                                            dataKey="expenses"
                                            name="Gastos"
                                            fill="hsl(25, 95%, 53%)"
                                            radius={[4, 4, 0, 0]}
                                            isAnimationActive={false}
                                            animationDuration={0}
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
            <MobileNav />
        </div>
    );
};

export default HistoryPage;
