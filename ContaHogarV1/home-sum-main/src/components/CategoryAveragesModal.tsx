import { Transaction } from '@/types/finance';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useMemo } from 'react';

interface CategoryAveragesModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

interface CategoryAverage {
  category: string;
  average: number;
}

const CategoryAveragesModal = ({ isOpen, onClose, transactions }: CategoryAveragesModalProps) => {
  const { expenseAverages, incomeAverages } = useMemo(() => {
    // Group transactions by category and month
    const expensesByCategory: Record<string, Record<string, number>> = {};
    const incomesByCategory: Record<string, Record<string, number>> = {};

    transactions
      .filter(t => !t.isPending)
      .forEach(transaction => {
        const target = transaction.type === 'expense' ? expensesByCategory : incomesByCategory;
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM
        
        if (!target[transaction.category]) {
          target[transaction.category] = {};
        }
        if (!target[transaction.category][monthKey]) {
          target[transaction.category][monthKey] = 0;
        }
        target[transaction.category][monthKey] += transaction.amount;
      });

    // Calculate averages per month
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
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasData = expenseAverages.length > 0 || incomeAverages.length > 0;

  // Calculate dynamic height based on number of categories
  const getChartHeight = (count: number) => Math.max(150, count * 32);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Media por Categorías</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay suficientes datos para mostrar medias.
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Expense Averages */}
            {expenseAverages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  Media de Gastos
                </h3>
                <div style={{ height: getChartHeight(expenseAverages.length) }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={expenseAverages}
                      layout="vertical"
                      margin={{ top: 5, right: 80, left: 5, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        width={100}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={20}>
                        {expenseAverages.map((_, index) => (
                          <Cell key={`expense-${index}`} fill="hsl(25, 95%, 53%)" />
                        ))}
                        <LabelList 
                          dataKey="average" 
                          position="right" 
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Income Averages */}
            {incomeAverages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Media de Ingresos
                </h3>
                <div style={{ height: getChartHeight(incomeAverages.length) }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={incomeAverages}
                      layout="vertical"
                      margin={{ top: 5, right: 80, left: 5, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        width={100}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={20}>
                        {incomeAverages.map((_, index) => (
                          <Cell key={`income-${index}`} fill="hsl(142, 76%, 36%)" />
                        ))}
                        <LabelList 
                          dataKey="average" 
                          position="right" 
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default CategoryAveragesModal;
