import { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  DollarSign, 
  Calendar, 
  Tag, 
  Palette,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScrollOnFocus } from '@/hooks/useScrollOnFocus';
import { withKeyboardClose } from '@/lib/utils';
import { SavingsGoal, Account } from '@/types/finance';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<SavingsGoal, 'id'> | SavingsGoal) => void;
  editingGoal: SavingsGoal | null;
  accounts: Account[];
}

const SavingsGoalModal = ({
  isOpen,
  onClose,
  onSave,
  editingGoal,
  accounts
}: SavingsGoalModalProps) => {
  const scrollOnFocus = useScrollOnFocus(240);
  
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(editingGoal.targetAmount.toString());
      setCurrentAmount(editingGoal.currentAmount.toString());
      setDeadline(editingGoal.deadline || '');
      setCategory(editingGoal.category || '');
      setAccountId(editingGoal.accountId || '');
    } else {
      resetForm();
    }
  }, [editingGoal, isOpen]);

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setCategory('');
    setAccountId('');
  };

  const handleSave = () => {
    if (!name.trim() || !targetAmount) return;

    const goalData = {
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || '0'),
      deadline: deadline || undefined,
      category: category.trim() || undefined,
      accountId: accountId || undefined,
    };

    if (editingGoal) {
      onSave({ ...goalData, id: editingGoal.id });
    } else {
      onSave(goalData);
    }
    
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-background/95 backdrop-blur-3xl">
        <div className="p-8">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {editingGoal ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Define tu próximo objetivo</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">¿Qué quieres conseguir?</Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                  <Tag className="w-4 h-4" />
                </div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Viaje a Japón, Nuevo Coche..."
                  className="pl-12 h-14 rounded-2xl bg-muted/30 border-none text-base font-bold transition-all focus:bg-white dark:focus:bg-card focus:ring-2 ring-primary"
                  onFocus={scrollOnFocus}
                />
              </div>
            </div>

            {/* Target Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Objetivo (€)</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-income transition-colors">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <Input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-none text-base font-bold focus:ring-2 ring-income"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Llevo ahorrado (€)</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <Input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-none text-base font-bold focus:ring-2 ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Fecha Límite (Opcional)</Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="pl-12 h-14 rounded-2xl bg-muted/30 border-none text-base font-bold focus:ring-2 ring-primary"
                />
              </div>
            </div>

            {/* Category or Account (Simplified Category for Metas) */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Categoría</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Viajes, Fondo, Compras..."
                className="h-14 rounded-2xl bg-muted/30 border-none text-base font-bold focus:ring-2 ring-primary"
              />
            </div>
          </div>

          <div className="mt-10 flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] border-border/50" 
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20" 
              onClick={() => withKeyboardClose(handleSave)}
              onPointerDown={() => withKeyboardClose(handleSave)}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SavingsGoalModal;
