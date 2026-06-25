import { useState, useEffect } from "react";
import {
  RecurringExpenseRule,
  RecurrenceFrequency,
  Category,
  Account,
} from "@/types/finance";
import {
  loadRecurringRules,
  addRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  getCategories,
  loadData,
} from "@/lib/storage";
import { syncAndSaveRecurringTransactions } from "@/lib/recurrence";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Clock, Edit2, Trash2, Calendar, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const RecurringExpensesManager = () => {
  const [rules, setRules] = useState<RecurringExpenseRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form State
  const [editingRule, setEditingRule] = useState<RecurringExpenseRule | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setRules(loadRecurringRules());
    setCategories(getCategories());
    const data = loadData();
    setAccounts(data.accounts);
  };

  const handleEdit = (rule: RecurringExpenseRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setAmount(rule.amount.toString());
    setCategory(rule.category);
    setAccountId(rule.accountId);
    setType(rule.type);
    setFrequency(rule.frequency);
    setStartDate(rule.startDate);
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta regla recurrente? Se borrarán todos los cobros futuros pendientes generados por ella.")) {
      deleteRecurringRule(id);
      syncAndSaveRecurringTransactions(loadData());
      refreshData();
      toast.success("Automatización eliminada");
      if (editingRule?.id === id) {
        handleCancelEdit();
      }
    }
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategory("");
    // We don't reset accountId so it remembers the last one
    setType("expense");
    setFrequency("monthly");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleSave = () => {
    if (!name || !amount || !category || !accountId || !startDate) {
      toast.error("Por favor completa todos los campos obligatorios.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Introduce un importe válido.");
      return;
    }

    if (editingRule) {
      // User can only modify amount and frequency. The rest is kept from the original rule.
      updateRecurringRule({
        ...editingRule,
        amount: numAmount,
        frequency,
      });
      toast.success("Automatización actualizada");
    } else {
      addRecurringRule({
        name,
        amount: numAmount,
        category,
        accountId,
        type,
        frequency,
        startDate,
      });
      toast.success("Automatización creada");
    }

    syncAndSaveRecurringTransactions(loadData());
    refreshData();
    setEditingRule(null);
    resetForm();
  };



  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Gastos Recurrentes</h2>
        <p className="text-sm text-muted-foreground">
          Genera transacciones pendientes a un año vista.
        </p>
        
        {rules.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="p-8 text-center flex flex-col items-center">
              <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                No tienes automatizaciones configuradas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
            {rules.map((rule) => (
              <Card key={rule.id} className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0",
                          rule.type === "income"
                            ? "bg-income/10 text-income"
                            : "bg-expense/10 text-expense"
                        )}
                      >
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm truncate">{rule.name}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
                          {rule.frequency === "monthly"
                            ? "Mensual"
                            : rule.frequency === "weekly"
                            ? "Semanal"
                            : "Anual"}{" "}
                          • {rule.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-3">
                      <p
                        className={cn(
                          "font-black text-base",
                          rule.type === "income" ? "text-income" : "text-expense"
                        )}
                      >
                        {rule.type === "income" ? "+" : "-"}
                        {rule.amount}€
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Desde {format(new Date(rule.startDate), "dd/MM/yy")}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-primary/10 text-primary"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="border-border/50 shadow-sm bg-muted/20">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
            {editingRule ? (
              <>
                <Edit2 className="w-5 h-5" />
                Editando Gasto Fijo
              </>
            ) : (
              "Añadir Nuevo Gasto Fijo"
            )}
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre / Concepto</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Alquiler"
                disabled={!!editingRule}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!!editingRule}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={!!editingRule}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
                disabled={!!editingRule}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Importe (€)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select
                value={frequency}
                onValueChange={(v: any) => setFrequency(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            {editingRule && (
              <Button
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
            )}
            <Button className="px-6" onClick={handleSave}>
              {editingRule ? "Guardar Cambios" : "Crear Regla"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
