/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category, Account, FavoriteExpense } from '@/types/finance';
import { Trash2, Plus, Zap, AlertCircle, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { loadData, loadFavorites, addFavorite as saveFavorite, updateFavorite as modifyFavorite, deleteFavorite as removeFavorite } from '@/lib/storage';

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

const FavoritesPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(() => loadData());
  const [favorites, setFavorites] = useState<FavoriteExpense[]>(() => loadFavorites());
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(data.categories[0]?.name || '');
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || '');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [customIcon, setCustomIcon] = useState<string | undefined>(undefined);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setCategory(data.categories[0]?.name || '');
    setAccountId(data.accounts[0]?.id || '');
    setDescription('');
    setIcon('Tag');
    setCustomIcon(undefined);
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

  const handleEdit = (fav: FavoriteExpense) => {
    setEditingId(fav.id);
    setName(fav.name);
    setAmount(fav.amount.toString());
    setCategory(fav.category);
    setAccountId(fav.accountId);
    setDescription(fav.description || '');
    setIcon(fav.icon || 'Tag');
    setCustomIcon(fav.customIcon);
    
    // Scroll to the edit form
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    removeFavorite(id);
    setFavorites(loadFavorites());
    toast.success('Favorito eliminado');
    if (editingId === id) resetForm();
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
      modifyFavorite({ ...favoriteData, id: editingId });
      toast.success('Favorito actualizado correctamente');
      setFavorites(loadFavorites());
      resetForm();
    } else {
      saveFavorite(favoriteData);
      setFavorites(loadFavorites());
      toast.success('Favorito guardado correctamente');
      resetForm();
    }
    
    // Scroll to top to see the updated list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <div className="w-full max-w-3xl mx-auto px-4 lg:px-12 py-4 sm:py-6">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full bg-background/50 hover:bg-background shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Gastos Rápidos
          </h1>
        </div>

        <div className="space-y-8 pb-24">
          
          {/* List of existing favorites */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Tus Favoritos ({favorites.length})
            </Label>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground italic bg-muted/30 p-6 rounded-2xl border border-dashed text-center">
                Aún no tienes gastos rápidos. Crea uno debajo para ahorrar tiempo.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favorites.map((fav) => {
                  const IconComponent = fav.customIcon ? null : ((Icons as any)[fav.icon || 'Tag'] || Icons.Tag);
                  
                  return (
                    <div 
                      key={fav.id}
                      className="flex items-center justify-between p-4 rounded-2xl border shadow-sm bg-card hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(fav)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex flex-shrink-0 items-center justify-center overflow-hidden">
                            {fav.customIcon ? (
                                <img src={fav.customIcon} className="w-full h-full object-cover" alt="" />
                            ) : (
                                IconComponent && <IconComponent className="w-5 h-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-base truncate">{fav.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {fav.amount}€ • {fav.category}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(fav.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-border/50" />

          {/* Form to add/edit */}
          <div className="space-y-6 bg-white dark:bg-card p-6 sm:p-8 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                {editingId ? 'Editar Favorito' : 'Nuevo Gasto Rápido'}
              </div>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="h-8 text-xs">Cancelar Edición</Button>
              )}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="fav-name" className="text-base font-semibold">Nombre del botón (ej: Café)</Label>
                <Input
                  id="fav-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Café, Bus, Almuerzo..."
                  className="bg-background h-12"
                  enterKeyHint="next"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="fav-amount" className="text-base font-semibold">Importe (€)</Label>
                <Input
                  id="fav-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-background h-12"
                  inputMode="decimal"
                  enterKeyHint="next"
                />
              </div>
              
              <div className="space-y-4 col-span-1 sm:col-span-2 mt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personalización del Botón</Label>
                <div className="flex flex-col sm:flex-row gap-6 items-start p-4 bg-muted/20 rounded-2xl border">
                  {/* Icon Preview & Selection */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Label className="text-xs font-bold">Vista Previa</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden bg-primary"
                      >
                        {customIcon ? (
                          <img src={customIcon} className="w-full h-full object-cover" alt="Custom" />
                        ) : (
                          (() => {
                            const IconComponent = (Icons as any)[icon] || Icons.Tag;
                            return <IconComponent className="w-8 h-8" />;
                          })()
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 text-xs font-bold" 
                          onClick={() => document.getElementById('fav-image-upload')?.click()}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" /> Subir Imagen
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
                            variant="ghost" 
                            size="sm" 
                            className="h-6 p-0 text-xs text-destructive hover:bg-transparent"
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
                    <div className="flex-1 w-full">
                      <Label className="text-xs font-bold mb-3 block">Galería de Iconos</Label>
                      <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-3 border rounded-xl bg-background custom-scrollbar">
                        {ICON_LIST.map((iconName) => {
                          const IconComp = (Icons as any)[iconName] || Icons.Tag;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => setIcon(iconName)}
                              className={cn(
                                "p-2.5 rounded-lg hover:bg-muted transition-colors",
                                icon === iconName ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"
                              )}
                            >
                              <IconComp className="w-5 h-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mt-2">
                <Label className="text-base font-semibold">Categoría de gasto</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background h-12">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 mt-2">
                <Label className="text-base font-semibold">Cuenta por defecto</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-background h-12">
                    <SelectValue placeholder="Selecciona cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <Label htmlFor="fav-desc" className="text-base font-semibold">Nota opcional</Label>
              <Input
                id="fav-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Por ejemplo: Desayuno barra alta"
                className="bg-background h-12"
                enterKeyHint="done"
              />
            </div>

            <div className="pt-6 mt-6 border-t flex flex-col gap-4">
              <Button 
                onClick={handleSave} 
                className="font-bold rounded-xl h-14 w-full shadow-lg text-lg"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Botón Rápido'}
              </Button>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-xl justify-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Los gastos rápidos se registrarán con la fecha del día actual.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
