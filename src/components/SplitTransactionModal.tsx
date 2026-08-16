import React, { useState, useMemo } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transaction, Category } from "@/types/finance";
import { getCategorySuggestions, findSimilarCategory } from "@/lib/storage";
import { SplitSquareHorizontal, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { cn, withKeyboardClose } from "@/lib/utils";
import { appToast as toast } from "@/lib/swal";

interface SplitTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalTransaction: Transaction | null;
  categories: (string | Category)[];
  onConfirmSplit: (splits: Array<{ amount: number; category: string; description: string }>) => Promise<void>;
}

const SplitTransactionModal = ({
  isOpen,
  onClose,
  originalTransaction,
  categories,
  onConfirmSplit,
}: SplitTransactionModalProps) => {
  const [splits, setSplits] = useState<Array<{ id: string; amount: string; category: string; description: string; showSuggestions: boolean; suggestions: string[] }>>([
    { id: "1", amount: "", category: "", description: "", showSuggestions: false, suggestions: [] }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSplitChange = (index: number, field: string, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    
    if (field === 'category') {
      if (value) {
        const filtered = getCategorySuggestions(value, categories);
        newSplits[index].suggestions = filtered;
        newSplits[index].showSuggestions = filtered.length > 0;
      } else {
        newSplits[index].suggestions = [];
        newSplits[index].showSuggestions = false;
      }
    }
    
    setSplits(newSplits);
  };

  const selectSuggestion = (index: number, suggestion: string) => {
    const newSplits = [...splits];
    newSplits[index].category = suggestion;
    newSplits[index].showSuggestions = false;
    setSplits(newSplits);
  };

  const addSplit = () => {
    setSplits([...splits, { id: Date.now().toString(), amount: "", category: "", description: "", showSuggestions: false, suggestions: [] }]);
  };

  const removeSplit = (index: number) => {
    const newSplits = [...splits];
    newSplits.splice(index, 1);
    setSplits(newSplits);
  };

  const totalSplits = useMemo(() => {
    return splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  }, [splits]);

  const baseAmount = useMemo(() => {
    return (originalTransaction?.amount || 0) - totalSplits;
  }, [originalTransaction?.amount, totalSplits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (baseAmount < 0) {
      toast.error("La suma de las divisiones no puede superar el gasto original.");
      return;
    }

    if (baseAmount === 0) {
      toast.error("Debes dejar algo de cantidad en el gasto principal. Si quieres cambiar toda la categoría, edita el gasto normal.");
      return;
    }

    const validSplits = splits.filter(s => parseFloat(s.amount) > 0 && s.category.trim() !== "");
    
    if (validSplits.length !== splits.length) {
      toast.error("Asegúrate de rellenar la cantidad y categoría de todas las divisiones.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSplits = validSplits.map(s => ({
        amount: parseFloat(s.amount),
        category: findSimilarCategory(s.category, categories) || s.category,
        description: s.description.trim()
      }));
      await onConfirmSplit(finalSplits);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la división.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!originalTransaction) return null;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent hideCloseButton={true} className="sm:max-w-[500px] w-full p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <SplitSquareHorizontal className="w-5 h-5 text-primary" />
              Dividir Gasto
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Desglosa este gasto en varias categorías
            </p>
          </div>

          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gasto Principal (Se quedará en)</span>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-lg">{originalTransaction.category}</span>
                {originalTransaction.description && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">{originalTransaction.description}</span>
                )}
              </div>
              <span className={cn("font-black text-2xl", baseAmount < 0 ? "text-destructive" : "text-primary")}>
                {baseAmount.toFixed(2)}€
              </span>
            </div>
            {baseAmount < 0 && (
              <span className="text-xs text-destructive font-medium mt-1">Te has pasado por {Math.abs(baseAmount).toFixed(2)}€</span>
            )}
          </div>

          <div className="space-y-4 max-h-[40vh] overflow-y-auto px-1 custom-scrollbar">
            {splits.map((split, index) => (
              <div key={split.id} className="p-4 rounded-xl border border-border/50 bg-card shadow-sm space-y-3 relative group">
                <div className="flex gap-3">
                  <div className="space-y-1.5 flex-1 relative">
                    <Label className="text-xs">Categoría</Label>
                    <div className="relative">
                        <Input
                        value={split.category}
                        onChange={(e) => handleSplitChange(index, 'category', e.target.value)}
                        placeholder="Ej: Ropa"
                        required
                        className="h-10 text-sm"
                        autoComplete="off"
                        />
                        {split.showSuggestions && split.suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto custom-scrollbar p-2 border border-border/50 rounded-xl bg-background shadow-lg">
                            {split.suggestions.slice(0, 5).map((suggestion, i) => (
                                <button
                                key={i}
                                type="button"
                                onClick={() => withKeyboardClose(() => selectSuggestion(index, suggestion))}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                                >
                                {suggestion}
                                </button>
                            ))}
                            </div>
                        )}
                    </div>
                  </div>
                  <div className="space-y-1.5 w-24">
                    <Label className="text-xs">Importe</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={split.amount}
                      onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      required
                      className="h-10 text-sm font-medium"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                    <Label className="text-xs">Nota / Detalles (Opcional)</Label>
                    <Input
                        value={split.description}
                        onChange={(e) => handleSplitChange(index, 'description', e.target.value)}
                        placeholder="Ej: Camiseta"
                        className="h-9 text-sm bg-muted/20"
                    />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSplit(index)}
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSplit}
            className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir otra división
          </Button>

          <div className="sticky bottom-[-1.5rem] z-20 -mb-6 -mx-6 px-6 pb-6 pt-4 bg-background border-t border-border/30 flex gap-3 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-12 text-sm font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || baseAmount < 0 || baseAmount === (originalTransaction?.amount || 0)}
              className="flex-1 h-12 text-sm font-bold text-white shadow-lg bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? "Dividiendo..." : "Confirmar División"}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default SplitTransactionModal;
