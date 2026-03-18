import { useState } from 'react';
import { withKeyboardClose } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Minus, TrendingUp, X } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

interface FloatingButtonsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
}

const FloatingButtons = ({ onAddIncome, onAddExpense }: FloatingButtonsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (type: 'income' | 'expense') => {
    setIsOpen(false);
    if (type === 'income') onAddIncome();
    else onAddExpense();
  };

  return (
    <>
      <div className="fixed bottom-28 right-4 z-50 lg:bottom-8 lg:right-8">
        <Button
          onClick={() => withKeyboardClose(() => setIsOpen(true))}
          onPointerDown={() => withKeyboardClose(() => setIsOpen(true))}
          size="lg"
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          aria-label="Añadir movimiento"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
        <ResponsiveDialogContent className="sm:max-w-[320px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-xl text-center">
              ¿Qué tipo de movimiento quieres añadir?
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="grid grid-cols-2 gap-4 p-4">
            <Button
              onClick={() => withKeyboardClose(() => handleSelect('expense'))}
              onPointerDown={() => withKeyboardClose(() => handleSelect('expense'))}
              variant="outline"
              className="flex flex-col items-center gap-3 h-24 border-2 hover:border-expense hover:bg-expense/10 transition-all"
            >
              <Minus className="h-8 w-8 text-expense" />
              <span className="font-semibold">Gasto</span>
            </Button>
            <Button
              onClick={() => withKeyboardClose(() => handleSelect('income'))}
              onPointerDown={() => withKeyboardClose(() => handleSelect('income'))}
              variant="outline"
              className="flex flex-col items-center gap-3 h-24 border-2 hover:border-income hover:bg-income/10 transition-all"
            >
              <TrendingUp className="h-8 w-8 text-income" />
              <span className="font-semibold">Ingreso</span>
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};

export default FloatingButtons;
