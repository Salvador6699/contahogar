import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadData } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const data = useMemo(() => loadData(), []);

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const transactionsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    data.transactions.forEach(tx => {
      const dateKey = tx.date; // yyyy-MM-dd
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(tx);
    });
    return map;
  }, [data.transactions]);

  const getDayStats = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const txs = transactionsByDay[key] || [];
    const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const net = income - expenses;
    return { income, expenses, net, count: txs.length, transactions: txs };
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDay(today);
  };

  const selectedDayStats = selectedDay ? getDayStats(selectedDay) : null;

  return (
    <div className="min-h-screen app-gradient-bg pb-32 lg:pl-20 pt-24">
      <div className="container max-w-4xl mx-auto px-4">
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Calendario</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Actividad Diaria</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/50 dark:bg-card/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/50">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="text-sm font-bold min-w-[140px] capitalize hover:bg-transparent" onClick={handleToday}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendar Grid */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-2xl shadow-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                {/* Days of week header */}
                <div className="grid grid-cols-7 mb-4">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-muted-foreground/50 uppercase py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((day, idx) => {
                    const stats = getDayStats(day);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const isToday = isSameDay(day, new Date());
                    const currentMonthFlag = isSameMonth(day, currentMonth);
                    
                    // Heatmap logic
                    let bgClass = "bg-transparent";
                    if (stats.net > 0) {
                      bgClass = stats.net > 500 ? "bg-income/20" : stats.net > 100 ? "bg-income/10" : "bg-income/5";
                    } else if (stats.net < 0) {
                      const absNet = Math.abs(stats.net);
                      bgClass = absNet > 500 ? "bg-expense/20" : absNet > 100 ? "bg-expense/10" : "bg-expense/5";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-300 group",
                          !currentMonthFlag && "opacity-20",
                          isSelected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background scale-95 shadow-lg" : "hover:bg-accent/50",
                          bgClass
                        )}
                      >
                        <span className={cn(
                          "text-sm font-bold",
                          isSelected ? "text-primary" : "text-foreground/80",
                          isToday && !isSelected && "text-primary underline decoration-2 underline-offset-4"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* Dots or Indicators */}
                        {stats.count > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {stats.income > 0 && <div className="w-1 h-1 rounded-full bg-income" />}
                            {stats.expenses > 0 && <div className="w-1 h-1 rounded-full bg-expense" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Day Details */}
          <div className="lg:col-span-4 space-y-4">
            {selectedDay ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-4">
                  <h3 className="text-lg font-black capitalize tracking-tight">
                    {format(selectedDay, "eeee, d 'de' MMMM", { locale: es })}
                  </h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                    Resumen del día
                  </p>
                </div>

                {/* Day Summary Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-income/5 border border-income/10">
                    <p className="text-[10px] font-black uppercase text-income/60">Ingresos</p>
                    <p className="text-sm font-black text-income">{formatCurrency(selectedDayStats?.income || 0)}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-expense/5 border border-expense/10">
                    <p className="text-[10px] font-black uppercase text-expense/60">Gastos</p>
                    <p className="text-sm font-black text-expense">{formatCurrency(selectedDayStats?.expenses || 0)}</p>
                  </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-3">
                  {selectedDayStats?.transactions.length === 0 ? (
                    <div className="py-8 text-center bg-white/30 dark:bg-card/30 rounded-3xl border border-dashed border-border/50">
                      <p className="text-xs text-muted-foreground font-black uppercase tracking-widest italic">Sin movimientos</p>
                    </div>
                  ) : (
                    selectedDayStats?.transactions.map((tx) => (
                      <div 
                        key={tx.id}
                        className="p-4 rounded-[1.5rem] bg-white dark:bg-card border border-border/50 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2.5 rounded-xl",
                            tx.type === 'income' ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
                          )}>
                            {tx.type === 'income' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold capitalize">{tx.category}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {tx.description && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <MessageSquare className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{tx.description}</span>
                                </div>
                              )}
                              {tx.isPending && (
                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                  Previsto
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={cn(
                          "text-sm font-black",
                          tx.type === 'income' ? "text-income" : "text-expense"
                        )}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/20 dark:bg-card/20 rounded-[2rem] border border-dashed border-border/50">
                <Clock className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground font-bold italic">Selecciona un día del calendario para ver el detalle</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
