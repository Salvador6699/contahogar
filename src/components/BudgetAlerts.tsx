import { Budget, CategorySummary, AlertSettings } from '@/types/finance';
import { AlertCircle, AlertTriangle, TrendingUp, X, BellRing } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BudgetAlertsProps {
  budgets: Budget[];
  categorySummaries: CategorySummary[];
  totalIncome: number;
  totalExpenses: number;
  alertSettings: AlertSettings;
  onUpdateSettings: (settings: Partial<AlertSettings>) => void;
  ignoreDismissals?: boolean;
}

const BudgetAlerts = ({
  budgets,
  categorySummaries,
  totalIncome,
  totalExpenses,
  alertSettings,
  onUpdateSettings,
  ignoreDismissals = false,
}: BudgetAlertsProps) => {
  const [showReschedule, setShowReschedule] = useState<string | null>(null);
  const [customVal, setCustomVal] = useState("");

  const { thresholdOverrides, dismissedItems, dismissedTotal } = alertSettings;

  const alerts = budgets.map(budget => {
    const summary = categorySummaries.find(s => s.category === budget.category);
    const spent = summary ? summary.total : 0;
    const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    // User threshold: custom override or default 75%
    const userThreshold = thresholdOverrides[budget.id] || 75;

    let status: 'danger' | 'warning' | 'info' | 'safe' = 'safe';
    let label = '';

    if (percent > 100) {
      status = 'danger';
      label = 'Límite Superado';
    } else if (percent === 100) {
      status = 'info';
      label = 'Límite Alcanzado';
    } else if (percent >= userThreshold) {
      status = 'warning';
      label = `Alerta (${Math.round(userThreshold)}%)`;
    }

    return {
      ...budget,
      spent,
      percent,
      status,
      label,
      userThreshold
    };
  }).filter(b => b.status !== 'safe' && (ignoreDismissals || !dismissedItems.includes(b.id)));

  const overspendingTotal = totalExpenses > totalIncome && totalIncome > 0 && (ignoreDismissals || !dismissedTotal);

  const handleReschedule = (id: string) => {
    const val = parseInt(customVal);
    if (!isNaN(val) && val > 0) {
      onUpdateSettings({
        thresholdOverrides: { ...thresholdOverrides, [id]: val }
      });
      setShowReschedule(null);
      setCustomVal("");
    }
  };

  const handleDismiss = (id: string) => {
    onUpdateSettings({
      dismissedItems: [...dismissedItems, id]
    });
  };

  const handleDismissTotal = () => {
    onUpdateSettings({ dismissedTotal: true });
  };

  if (alerts.length === 0 && !overspendingTotal) return null;

  return (
    <div className="space-y-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Alertas de Control
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Total Overspending Alert */}
        {overspendingTotal && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 relative group">
            <div className="p-2 rounded-full bg-destructive/20 text-destructive">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="space-y-1 pr-8">
              <p className="font-bold text-sm text-destructive uppercase tracking-tight">Déficit Mensual</p>
              <p className="text-xs text-destructive/80 leading-snug">
                Tus gastos ({formatCurrency(totalExpenses)}) han superado tus ingresos ({formatCurrency(totalIncome)}).
              </p>
            </div>
            <button 
              onClick={handleDismissTotal}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 hover:bg-destructive/20 text-destructive shadow-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Budget Specific Alerts */}
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={cn(
              "p-4 rounded-2xl border flex flex-col gap-3 transition-all relative group overflow-hidden",
              alert.status === 'danger' 
                ? "bg-destructive/10 border-destructive/20" 
                : alert.status === 'info'
                ? "bg-primary/5 border-primary/20"
                : "bg-amber-500/10 border-amber-500/20"
            )}
          >
            {showReschedule === alert.id ? (
              <div className="flex flex-col gap-2 p-1 animate-in zoom-in-95 duration-200">
                <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                  <BellRing className="w-3 h-3 text-primary" /> Re-programar alerta
                </p>
                <p className="text-xs font-bold leading-tight">Avisar cuando llegue al:</p>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="%" 
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    className="h-8 text-xs bg-background w-16"
                  />
                  <Button size="sm" className="h-8 text-[10px] font-bold" onClick={() => handleReschedule(alert.id)}>Fijar</Button>
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold px-2" onClick={() => setShowReschedule(null)}>X</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between pr-14">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      alert.status === 'danger' ? "bg-destructive text-white" : alert.status === 'info' ? "bg-primary text-white" : "bg-amber-500 text-white"
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm tracking-tight capitalize truncate">{alert.category}</p>
                      <p className="text-[10px] uppercase font-black opacity-60">
                        {alert.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(alert.spent)}</p>
                    <p className="text-[10px] font-bold opacity-60">de {formatCurrency(alert.amount)}</p>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button 
                    onClick={() => setShowReschedule(alert.id)}
                    title="Configurar siguiente aviso"
                    className="p-1.5 rounded-lg bg-background/50 hover:bg-primary/10 text-primary shadow-sm transition-all"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDismiss(alert.id)}
                    title="Eliminar aviso"
                    className="p-1.5 rounded-lg bg-background/50 hover:bg-destructive/10 text-destructive shadow-sm transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span>Progreso</span>
                    <span className={cn(
                      alert.status === 'danger' ? "text-destructive" : alert.status === 'info' ? "text-primary" : "text-amber-600"
                    )}>
                      {Math.round(alert.percent)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(alert.percent, 100)} 
                    className="h-1.5"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetAlerts;
