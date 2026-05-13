import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category, Account, FavoriteExpense } from '@/types/finance';
import { Tag, Trash2, Plus, Zap, AlertCircle, Image as ImageIcon, Pencil } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ICON_LIST = [
  'Tag', 'Wallet', 'CreditCard', 'Banknote', 'PiggyBank', 'ShoppingCart', 'ShoppingBag', 'ShoppingBasket',
  'Store', 'Utensils', 'Coffee', 'Pizza', 'Beer', 'Wine', 'Apple', 'Beef', 'Car', 'Bus', 'Train', 'Plane',
  'Bike', 'Fuel', 'Home', 'Smartphone', 'Laptop', 'Tv', 'Zap', 'Lightbulb', 'Droplet', 'Flame', 'Heart',
  'Stethoscope', 'Activity', 'Dumbbell', 'Gamepad2', 'Music', 'Film', 'Dog', 'Cat', 'Baby', 'Briefcase',
  'GraduationCap', 'Ship', 'Gift', 'Wrench', 'Hammer', 'Settings', 'Target', 'Trophy', 'Star',
  'Search', 'Calendar', 'Clock', 'ShieldCheck', 'Lock', 'Bell', 'Mail', 'Phone', 'Camera', 'Map',
  'Headphones', 'Wifi', 'Thermometer', 'Navigation', 'Tree', 'Flower', 'Sun', 'Moon', 'Cloud', 'HardDrive',
  'Monitor', 'Tablet', 'Watch', 'Video', 'Inbox', 'Unlock', 'Key', 'Tool', 'Trash', 'Eye', 'Image',
  'File', 'Folder', 'User', 'Users', 'Layout', 'PieChart', 'BarChart', 'TrendingUp', 'TrendingDown',
  'DollarSign', 'Euro', 'Award', 'CheckCircle', 'AlertTriangle'
];

interface FavoriteExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteExpense[];
  categories: Category[];
  accounts: Account[];
  onSave: (favorite: Omit<FavoriteExpense, 'id'> | FavoriteExpense) => void;
  onDelete: (id: string) => void;
  editingFavorite?: FavoriteExpense | null;
}

const FavoriteExpenseModal = ({
  isOpen,
  onClose,
  favorites,
  categories,
  accounts,
  onSave,
  onDelete,
  editingFavorite,
}: FavoriteExpenseModalProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [customIcon, setCustomIcon] = useState<string | undefined>(undefined);

  const resetForm = () => {
    if (editingFavorite) {
      setEditingId(editingFavorite.id);
      setName(editingFavorite.name);
      setAmount(editingFavorite.amount.toString());
      setCategory(editingFavorite.category);
      setAccountId(editingFavorite.accountId);
      setDescription(editingFavorite.description || '');
      setIcon(editingFavorite.icon || 'Tag');
      setCustomIcon(editingFavorite.customIcon);
    } else {
      setEditingId(null);
      setName('');
      setAmount('');
      setCategory(categories[0]?.name || '');
      setAccountId(accounts[0]?.id || '');
      setDescription('');
      setIcon('Tag');
      setCustomIcon(undefined);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 120;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setCustomIcon(canvas.toDataURL('image/png', 0.8));
          setIcon('Tag'); 
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) resetForm();
  }, [isOpen, editingFavorite]);

  const handleEdit = (fav: FavoriteExpense) => {
    setEditingId(fav.id);
    setName(fav.name);
    setAmount(fav.amount.toString());
    setCategory(fav.category);
    setAccountId(fav.accountId);
    setDescription(fav.description || '');
    setIcon(fav.icon || 'Tag');
    setCustomIcon(fav.customIcon);
  };

  const handleSave = () => {
    if (!name || !amount || !category || !accountId) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    const favoriteData = {
      name,
      amount: parseFloat(amount),
      category,
      accountId,
      description,
      type: 'expense' as const,
      icon,
      customIcon,
    };

    if (editingId) {
      onSave({ ...favoriteData, id: editingId });
      onClose(); // Volver a inicio al editar
    } else {
      onSave(favoriteData);
      if (window.confirm("Favorito guardado correctamente. ¿Deseas añadir otro favorito?")) {
        resetForm();
      } else {
        onClose(); // Volver a inicio al crear si no quiere otro
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Gestionar Gastos Rápidos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar flex flex-col space-y-6">
          {/* List of existing favorites */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Tus Favoritos ({favorites.length})
            </Label>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg border border-dashed">
                Aún no tienes gastos rápidos. Crea uno debajo para ahorrar tiempo.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {favorites.map((fav) => (
                  <div 
                    key={fav.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors group"
                  >
                    <div className="min-w-0" onClick={() => handleEdit(fav)}>
                      <p className="font-bold text-sm truncate">{fav.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fav.amount}€ • {fav.category}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(fav.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr />

          {/* Form to add/edit */}
          <div className="space-y-4 bg-muted/30 p-4 rounded-2xl border border-primary/10">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              {editingId ? 'Editar Favorito' : 'Nuevo Gasto Rápido'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fav-name">Nombre del botón (ej: Café)</Label>
                <Input
                  id="fav-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Café, Bus, Almuerzo..."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fav-amount">Importe (€)</Label>
                <Input
                  id="fav-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-4 col-span-1 sm:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personalización del Botón</Label>
                <div className="flex flex-wrap gap-4 items-start">
                  {/* Icon Preview & Selection */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Icono o Imagen</Label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md overflow-hidden bg-primary"
                      >
                        {customIcon ? (
                          <img src={customIcon} className="w-full h-full object-cover" alt="Custom" />
                        ) : (
                          (() => {
                            const IconComponent = (Icons as any)[icon] || Icons.Tag;
                            return <IconComponent className="w-6 h-6" />;
                          })()
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] font-bold" 
                          onClick={() => document.getElementById('fav-image-upload')?.click()}
                        >
                          <ImageIcon className="w-3 h-3 mr-1" /> Subir Imagen
                        </Button>
                        <input
                          id="fav-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        {customIcon && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-4 p-0 text-[9px] text-destructive"
                            onClick={() => setCustomIcon(undefined)}
                          >
                            Eliminar imagen
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Icon Gallery */}
                  {!customIcon && (
                    <div className="flex-1">
                      <Label className="text-xs mb-2 block">Seleccionar Icono</Label>
                      <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-2 border rounded-lg bg-background">
                        {ICON_LIST.map((iconName) => {
                          const IconComp = (Icons as any)[iconName] || Icons.Tag;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => setIcon(iconName)}
                              className={cn(
                                "p-2 rounded-md hover:bg-muted transition-colors",
                                icon === iconName ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                              )}
                            >
                              <IconComp className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoría de gasto</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cuenta por defecto</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecciona cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fav-desc">Nota opcional</Label>
              <Input
                id="fav-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Por ejemplo: Desayuno barra alta"
                className="bg-background"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 mt-auto border-t border-border/20 sticky bottom-0 bg-background pb-4 z-10">
              <Button variant="ghost" onClick={onClose} className="h-12 flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.click();
                }}
                className="font-bold rounded-xl h-12 flex-1 sm:flex-none"
              >
                {editingId ? 'Guardar Cambios' : 'Añadir Favorito'}
              </Button>
            </div>
          </div>

          <DialogFooter className="sm:justify-start pb-6 shrink-0 mt-auto">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted p-2 rounded-lg w-full mt-4">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Los gastos rápidos se registrarán con la fecha del día actual automáticamente.</span>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FavoriteExpenseModal;
