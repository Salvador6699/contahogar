import { useState, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  Pencil, 
  TrendingUp, 
  Calendar, 
  Info,
  ChevronRight,
  PiggyBank,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  format, 
  differenceInMonths, 
  parseISO, 
  addMonths, 
  isPast 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  loadData, 
  addSavingsGoal, 
  updateSavingsGoal, 
  deleteSavingsGoal 
} from '@/lib/storage';
import { formatCurrency, calculateTotalBalance } from '@/lib/calculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import SavingsGoalModal from '@/components/SavingsGoalModal';
import { SavingsGoal } from '@/types/finance';
import { toast } from 'sonner';

const SavingsPage = () => {
  const [data, setData] = useState(loadData());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  
  const goals = useMemo(() => data.savingsGoals || [], [data]);
  const totalBalance = useMemo(() => calculateTotalBalance(data.accounts, data.transactions), [data]);

  // Handle updates
  const refreshData = () => setData(loadData());

  const handleSave = (goal: Omit<SavingsGoal, 'id'> | SavingsGoal) => {
    if ('id' in goal) {
      updateSavingsGoal(goal as SavingsGoal);
      toast.success('Meta actualizada');
    } else {
      addSavingsGoal(goal);
      toast.success('¡Nueva meta creada!');
    }
    refreshData();
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteSavingsGoal(id);
    refreshData();
    toast.success('Meta de ahorro eliminada');
  };

  const calculateSuggestedMonthly = (goal: SavingsGoal) => {
    if (!goal.deadline) return null;
    const monthsLeft = differenceInMonths(parseISO(goal.deadline), new Date());
    if (monthsLeft <= 0) return goal.targetAmount - goal.currentAmount;
    const remaining = goal.targetAmount - goal.currentAmount;
    return remaining > 0 ? remaining / monthsLeft : 0;
  };

  const totalSavedInGoals = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <div className="min-h-screen app-gradient-bg pb-32 lg:pl-20 pt-24">
      <div className="container max-w-5xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner-sm">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Mis Metas</h1>
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest mt-0.5 opacity-70">Sueños en construcción</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="px-6 py-3 bg-white/40 dark:bg-card/40 backdrop-blur-md rounded-[2rem] border border-border/50 shadow-sm flex items-center gap-4">
              <div className="p-2 bg-income/10 rounded-xl">
                <PiggyBank className="w-5 h-5 text-income" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground/60 leading-none mb-1">Ahorro Total Actual</p>
                <p className="text-xl font-black text-income leading-none">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
            <Button 
              size="lg" 
              className="rounded-full gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
              onClick={() => {
                setEditingGoal(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-5 h-5" />
              Nueva Meta
            </Button>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white/30 dark:bg-card/30 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-border/50">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-primary/30" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-foreground/70">¿Qué planeas para el futuro?</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                Añade tu primera meta de ahorro, como un viaje, un coche o un fondo de emergencia.
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const suggested = calculateSuggestedMonthly(goal);
              const isCompleted = progress >= 100;

              return (
                <Card key={goal.id} className="group relative border-none bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-primary/5 overflow-hidden hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1">
                  <CardContent className="p-8">
                    {/* Goal Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black tracking-tight capitalize text-foreground/90">{goal.name}</h3>
                          {isCompleted && (
                            <CheckCircle2 className="w-5 h-5 text-income animate-in zoom-in-0 duration-500" />
                          )}
                        </div>
                        {goal.category && (
                          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none bg-primary/5 text-primary">
                            {goal.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
                          onClick={() => handleEdit(goal)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive" onClick={() => handleDelete(goal.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Circle/Info */}
                    <div className="relative mb-8 pt-4">
                      <div className="flex justify-between items-end mb-3">
                        <div>
                          <p className="text-2xl font-black tracking-tighter text-foreground">
                            {formatCurrency(goal.currentAmount)}
                          </p>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            de {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-3xl font-black italic tracking-tighter",
                            isCompleted ? "text-income" : "text-primary/40"
                          )}>
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={progress} 
                        className={cn(
                          "h-3 rounded-full bg-primary/5",
                          isCompleted ? "[&>div]:bg-gradient-to-r from-income to-emerald-400" : "[&>div]:bg-primary"
                        )} 
                      />
                    </div>

                    {/* Deadline and Suggestion */}
                    <div className="space-y-4 pt-4 border-t border-border/10">
                      {goal.deadline && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-tight">
                              {isPast(parseISO(goal.deadline)) ? 'Finalizado' : format(parseISO(goal.deadline), "MMM yyyy", { locale: es })}
                            </span>
                          </div>
                          {!isCompleted && suggested && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/5 text-amber-600 rounded-full border border-amber-500/10">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-tight">
                                +{formatCurrency(suggested)}/mes
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!goal.deadline && !isCompleted && (
                        <p className="text-[10px] text-muted-foreground font-medium italic flex items-center gap-1.5 opacity-60">
                          <Info className="w-3.5 h-3.5" />
                          Sin fecha límite definida
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <SavingsGoalModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        editingGoal={editingGoal}
        accounts={data.accounts}
      />
    </div>
  );
};

export default SavingsPage;
