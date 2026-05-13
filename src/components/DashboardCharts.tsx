import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatCurrency } from '@/lib/calculations';
import { CategorySummary, Category, Account } from '@/types/finance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardChartsProps {
    expenseCategories: CategorySummary[];
    totalIncome: number;
    totalExpenses: number;
    selectedAccount: string;
    accounts?: Account[];
    categoryCatalog?: Category[];
}

const DashboardCharts = ({ expenseCategories, totalIncome, totalExpenses, selectedAccount, accounts = [], categoryCatalog = [] }: DashboardChartsProps) => {
    const [topCount, setTopCount] = useState<string>("5");

    const selectedAccObj = accounts.find(a => a.id === selectedAccount);
    const accountLabel = selectedAccObj ? ` · ${selectedAccObj.name}` : '';

    // Prep data for Pie Chart (Expenses by Category)
    const sortedData = expenseCategories.map(cat => ({
        name: cat.category,
        value: cat.total
    })).sort((a, b) => b.value - a.value);

    const pieData = topCount === "all"
        ? sortedData
        : sortedData.slice(0, parseInt(topCount));

    // Prep data for Bar Chart (Income vs Expenses)
    const barData = [
        {
            name: 'Resumen',
            Ingresos: totalIncome,
            Gastos: totalExpenses,
        }
    ];

    const COLORS = [
        'hsl(215 70% 35%)',
        'hsl(142 76% 36%)',
        'hsl(24 95% 53%)',
        'hsl(199 89% 48%)',
        'hsl(271 91% 65%)',
        'hsl(340 82% 52%)',
        'hsl(162 63% 41%)',
        'hsl(45 93% 47%)',
        'hsl(200 95% 39%)',
        'hsl(262 83% 58%)',
        'hsl(10 85% 60%)',
        'hsl(175 60% 45%)',
        'hsl(60 80% 40%)',
        'hsl(220 70% 50%)',
        'hsl(290 60% 60%)'
    ];

    return (
        <div className="mb-6">
            {/* Expenses Pie Chart - Now Full Width */}
            <Card className="border-none shadow-sm bg-white dark:bg-card overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Top Gastos{accountLabel}
                    </CardTitle>
                    <Select value={topCount} onValueChange={setTopCount}>
                        <SelectTrigger className="w-[90px] h-8 text-xs font-bold border-none bg-muted/50">
                            <SelectValue placeholder="Ver" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">Top 5</SelectItem>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="15">Top 15</SelectItem>
                            <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
                        {/* Fixed Chart */}
                        <div className="h-[250px] w-full sm:w-[50%] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        isAnimationActive={false}
                                        animationDuration={0}
                                    >
                                        {pieData.map((entry, index) => {
                                            const catObj = categoryCatalog.find(c => c.name === entry.name);
                                            const color = catObj?.color || COLORS[index % COLORS.length];
                                            return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        isAnimationActive={false}
                                        animationDuration={0}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Scrollable Legend List */}
                        <ScrollArea className="h-[250px] w-full border-l dark:border-border/20 pl-6 py-1">
                            <div className="space-y-4">
                                {pieData.map((item, index) => (
                                    <div key={item.name} className="flex flex-col gap-0.5 group shrink-0">
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const catObj = categoryCatalog.find(c => c.name === item.name);
                                                const color = catObj?.color || COLORS[index % COLORS.length];
                                                return (
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                );
                                            })()}
                                            <span className="text-[12px] font-bold leading-tight capitalize text-foreground/90">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="pl-5">
                                            <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors tabular-nums">
                                                {formatCurrency(item.value)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardCharts;
