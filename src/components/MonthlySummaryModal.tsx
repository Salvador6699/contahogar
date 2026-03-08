import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Transaction } from '@/types/finance';
import { formatCurrency } from '@/lib/calculations';
import { format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSelectMonth: (month: string) => void;
}

interface MonthlyData {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
}

const MonthlySummaryModal = ({ isOpen, onClose, transactions, onSelectMonth }: MonthlySummaryModalProps) => {
  // Group transactions by month
  const monthlyData: MonthlyData[] = (() => {
    const monthMap = new Map<string, Transaction[]>();

    const isTransfer = (category: string) => {
      const normalized = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized === 'transferencia';
    };

    transactions.forEach(transaction => {
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
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  })();

  const handleBarClick = (data: MonthlyData) => {
    onSelectMonth(data.monthKey);
    onClose();
  };

  const chartConfig = {
    income: {
      label: 'Ingresos',
      color: 'hsl(142, 76%, 36%)', // Green
    },
    expenses: {
      label: 'Gastos',
      color: 'hsl(25, 95%, 53%)', // Orange
    },
  };

  console.log('MonthlySummaryModal render - isOpen:', isOpen, 'monthlyData length:', monthlyData.length);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[600px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Resumen por Meses</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="py-4 px-4 sm:px-0 max-h-[70vh] overflow-y-auto">
          {monthlyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay transacciones registradas
            </p>
          ) : (
            <>
              {/* Chart - responsive for all screen sizes */}
              <div className="mb-6">
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        className="text-muted-foreground"
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
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
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar
                        dataKey="income"
                        name="Ingresos"
                        fill="hsl(142, 76%, 36%)"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(_, index) => handleBarClick(monthlyData[index])}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Gastos"
                        fill="hsl(25, 95%, 53%)"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(_, index) => handleBarClick(monthlyData[index])}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                <p className="text-xs text-muted-foreground text-center mt-2">
                  Toca una barra para ver el detalle de ese mes
                </p>
              </div>

              {/* Month list - always visible */}
              <div className="sm:mt-6 space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Selecciona un mes para ver sus detalles
                </p>
                {monthlyData.map((data) => (
                  <button
                    key={data.monthKey}
                    onClick={() => handleBarClick(data)}
                    className="w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium capitalize">{data.month}</span>
                      <div className="flex gap-3 text-sm flex-shrink-0">
                        <span className="text-green-600">+{formatCurrency(data.income)}</span>
                        <span className="text-orange-600">-{formatCurrency(data.expenses)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default MonthlySummaryModal;
