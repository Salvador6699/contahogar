import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RecurringExpenseRule,
  RecurrenceFrequency,
} from "@/types/finance";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2, Calendar, PlusCircle, Search, X, Repeat, CreditCard, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { appToast as toast } from "@/lib/swal";
import { formatCurrency } from "@/lib/calculations";

export const RecurringExpensesManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { rules, addRule, updateRule, deleteRule, isLoading: isRulesLoading } = useRecurringRules();
  const { categories, isLoading: isCatLoading } = useCategories();
  const { accounts, isLoading: isAccLoading } = useAccounts();

  // Search and UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Form State
  const [editingRule, setEditingRule] = useState<RecurringExpenseRule | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [customInterval, setCustomInterval] = useState("1");
  const [customIntervalUnit, setCustomIntervalUnit] = useState<"days" | "months" | "years">("months");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const editRuleId = searchParams.get("editRuleId");
    if (editRuleId && rules.length > 0) {
      const targetRule = rules.find((r) => r.id === editRuleId);
      if (targetRule) {
        handleEdit(targetRule);
        
        // Remove editRuleId from url to prevent re-opening modal on every load
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("editRuleId");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, rules, setSearchParams]);

  const handleEdit = (rule: RecurringExpenseRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setAmount(rule.amount.toString());
    setCategory(rule.category);
    setAccountId(rule.accountId);
    setType(rule.type);
    setFrequency(rule.frequency);
    setCustomInterval(rule.customInterval?.toString() || "1");
    setCustomIntervalUnit(rule.customIntervalUnit || "months");
    setStartDate(rule.startDate);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategory("");
    setType("expense");
    setFrequency("monthly");
    setCustomInterval("1");
    setCustomIntervalUnit("months");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleOpenAdd = () => {
    setEditingRule(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setTimeout(resetForm, 300); // wait for modal close animation
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar esta regla recurrente? Se borrarán todos los cobros futuros pendientes generados por ella.")) {
      await deleteRule(id);
      toast.success("Automatización eliminada");
      if (editingRule?.id === id) {
        handleCancelModal();
      }
    }
  };

  const handleSave = async () => {
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
      await updateRule({
        ...editingRule,
        name,
        category,
        accountId,
        amount: numAmount,
        frequency,
        customInterval: frequency === "custom" ? parseInt(customInterval) || 1 : undefined,
        customIntervalUnit: frequency === "custom" ? customIntervalUnit : undefined,
        startDate: startDate,
      });
      toast.success("Automatización actualizada");
    } else {
      await addRule({
        name,
        amount: numAmount,
        category,
        accountId,
        type,
        frequency,
        customInterval: frequency === "custom" ? parseInt(customInterval) || 1 : undefined,
        customIntervalUnit: frequency === "custom" ? customIntervalUnit : undefined,
        startDate,
      });
      toast.success("Automatización creada");
    }

    handleCancelModal();
  };

  const toggleRow = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  if (isRulesLoading || isCatLoading || isAccLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
  }

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    rule.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFrequencyLabel = (rule: RecurringExpenseRule) => {
    if (rule.frequency === "monthly") return "Mensual";
    if (rule.frequency === "weekly") return "Semanal";
    if (rule.frequency === "yearly") return "Anual";
    return `Cada ${rule.customInterval} ${
      rule.customIntervalUnit === "days" ? "días" : 
      rule.customIntervalUnit === "months" ? "meses" : "años"
    }`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-32">
      
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-2">
            <Repeat className="w-8 h-8 text-primary" />
            Gastos Fijos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Transacciones automáticas generadas a futuro.
          </p>
        </div>
        
        <Button 
          onClick={handleOpenAdd}
          className="font-bold rounded-2xl h-12 px-6 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Añadir Gasto Fijo
        </Button>
      </div>

      {/* Search Bar */}
      {rules.length > 0 && (
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar regla o categoría..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-11 h-12 bg-card border-border/50 font-medium rounded-2xl shadow-sm focus-visible:ring-primary/20 transition-all text-base"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-card/50 rounded-3xl border border-dashed border-border/60 p-12 text-center flex flex-col items-center justify-center mt-8">
          <Repeat className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-bold text-foreground">No hay gastos fijos</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Crea reglas automáticas para tus suscripciones, alquileres o facturas recurrentes y se añadirán solos a tu previsión.
          </p>
          <Button onClick={handleOpenAdd} variant="outline" className="mt-6 rounded-2xl h-11 px-6 font-bold">
            Añadir mi primer gasto fijo
          </Button>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron resultados para "{searchQuery}"
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRules.map((rule) => {
            const isExpanded = expandedRow === rule.id;
            const account = accounts.find(a => a.id === rule.accountId);
            
            return (
              <div 
                key={rule.id} 
                className={cn(
                  "bg-card rounded-3xl border shadow-sm overflow-hidden transition-all duration-300",
                  isExpanded ? "border-primary/30" : "border-border/50 hover:border-primary/20"
                )}
              >
                {/* COMPACT ROW */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleRow(rule.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 transition-colors",
                        rule.type === "income"
                          ? "bg-income/10 text-income"
                          : "bg-expense/10 text-expense"
                      )}
                    >
                      <Repeat className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-base truncate text-foreground/90">{rule.name}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate flex items-center gap-2 mt-1">
                        <span>{getFrequencyLabel(rule)}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="truncate">{rule.category}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        "font-black text-xl",
                        rule.type === "income" ? "text-income" : "text-expense"
                      )}
                    >
                      {rule.type === "income" ? "+" : "-"}
                      {formatCurrency(rule.amount)}
                    </p>
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                  <div className="p-4 pt-3 border-t border-border/30 bg-muted/5 animate-in slide-in-from-top-2">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                      
                      <div className="flex flex-col gap-3 flex-1 text-sm bg-background/50 p-4 rounded-2xl border border-border/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Fecha de Inicio</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {format(new Date(rule.startDate), "dd 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-medium">Cuenta</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {account?.name || "Cuenta eliminada"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Tag className="w-4 h-4" />
                            <span className="font-medium">Categoría</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {rule.category}
                          </span>
                        </div>
                      </div>

                    </div>
                    
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="h-10 px-4 rounded-xl hover:bg-primary/10 text-primary transition-colors font-bold border border-transparent hover:border-primary/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(rule);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 px-4 rounded-xl text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-bold"
                        onClick={(e) => handleDelete(rule.id, e)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FOR ADD/EDIT */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancelModal()}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden">
          <DialogHeader className="pt-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {editingRule ? (
                <>
                  <Edit2 className="w-5 h-5 text-primary" />
                  Editar Gasto Fijo
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-primary" />
                  Nuevo Gasto Fijo
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
            <div className="space-y-2">
              <Label>Nombre / Concepto</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Alquiler, Netflix, Agua..."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Importe (€)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 rounded-xl font-black text-lg pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={frequency}
                  onValueChange={(v: RecurrenceFrequency) => setFrequency(v)}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {frequency === "custom" && (
              <div className="flex gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in">
                <div className="space-y-2 flex-1">
                  <Label>Cada</Label>
                  <Input
                    type="number"
                    min="1"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Unidad</Label>
                  <Select
                    value={customIntervalUnit}
                    onValueChange={(v: "days" | "months" | "years") => setCustomIntervalUnit(v)}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Días</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                      <SelectItem value="years">Años</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger className="h-11 rounded-xl">
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
              <Label>Cuenta de cargo</Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
              >
                <SelectTrigger className="h-11 rounded-xl">
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
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v: "income" | "expense") => setType(v)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Gasto (-)</SelectItem>
                  <SelectItem value="income">Ingreso (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/30 mt-2">
            <Button
              variant="ghost"
              onClick={handleCancelModal}
              className="rounded-xl h-11 px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button 
              className="rounded-xl px-6 h-11 font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90" 
              onClick={handleSave}
            >
              {editingRule ? "Guardar Cambios" : "Crear Regla"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
