import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FavoriteExpense, Category, Account } from '@/types/finance';
import { Plus, Zap, Settings, X, MoreHorizontal, Layout, Pencil, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickExpensesProps {
  favorites: FavoriteExpense[];
  categories: Category[];
  accounts: Account[];
  onAddTransaction: (favorite: FavoriteExpense) => void;
  onManageFavorites: () => void;
  onEditFavorite: (favorite: FavoriteExpense) => void;
  onDeleteFavorite: (id: string) => void;
}

const QuickExpenses = ({
  favorites,
  categories,
  accounts,
  onAddTransaction,
  onManageFavorites,
  onEditFavorite,
  onDeleteFavorite,
}: QuickExpensesProps) => {
  if (favorites.length === 0) {
    return (
      <Card className="p-6 border-2 border-dashed border-muted bg-muted/5 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-foreground">Gasto Rápido</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Configura tus gastos habituales para registrarlos con un solo toque.
          </p>
        </div>
        <Button size="sm" onClick={onManageFavorites} className="rounded-full font-bold h-9">
          <Plus className="w-4 h-4 mr-2" /> Configurar
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Gasto Rápido
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onManageFavorites}
          className="h-8 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          <Settings className="w-3.5 h-3.5 mr-1" /> Gestionar
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {favorites.map((fav) => {
          const cat = categories.find(c => c.name === fav.category);
          const acc = accounts.find(a => a.id === fav.accountId);
          
          // Determine the icon/image to show
          // Priority: 1. Favorite Custom Image, 2. Favorite Icon, 3. Category Custom Image, 4. Category Icon
          const displayCustomIcon = fav.customIcon || cat?.customIcon;
          const displayIcon = fav.icon || cat?.icon || 'Tag';
          const IconComponent = (Icons as any)[displayIcon] || Icons.Tag;

          return (
            <div key={fav.id} className="relative group">
              <Button
                variant="outline"
                className={cn(
                  "w-full h-auto py-3 px-2 flex flex-col items-center gap-2 border-2 transition-all active:scale-95 overflow-hidden",
                  "hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                )}
                onClick={() => onAddTransaction(fav)}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm overflow-hidden"
                  style={{ backgroundColor: cat?.color || '#3b82f6' }}
                >
                  {displayCustomIcon ? (
                    <img src={displayCustomIcon} className="w-full h-full object-cover" alt={fav.name} />
                  ) : (
                    <IconComponent className="w-5 h-5" />
                  )}
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-[11px] font-black uppercase tracking-tight truncate leading-tight">
                    {fav.name}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(fav.amount)}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70 truncate">
                    {acc?.name || 'Cuenta'}
                  </p>
                </div>
              </Button>

              {/* Edit/Delete Overlay icons */}
              <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFavorite(fav.id);
                  }}
                  className="p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditFavorite(fav);
                  }}
                  className="p-1 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors shadow-sm"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
        
        {/* Helper button to add more */}
        <Button
          variant="outline"
          className="h-auto py-3 px-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground"
          onClick={onManageFavorites}
        >
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Añadir</span>
        </Button>
      </div>
    </div>
  );
};

export default QuickExpenses;
