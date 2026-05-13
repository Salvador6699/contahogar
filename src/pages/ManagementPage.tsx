import { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  ChevronRight,
  Tag,
  Calendar,
  Wallet,
  ArrowRight,
  ShoppingBag,
  Utensils,
  Car,
  Smartphone,
  Zap,
  Heart,
  Gamepad2,
  Gift,
  Briefcase,
  GraduationCap,
  Plane,
  Music,
  Coffee,
  Film,
  Stethoscope,
  Dog,
  Dumbbell,
  CreditCard
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  getCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory,
  loadRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  loadData
} from '@/lib/storage';
import { processRecurringTransactions } from '@/lib/automation';
import { Category, RecurringTransaction, RecurrenceFrequency, Account } from '@/types/finance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addMonths } from 'date-fns';

const ManagementPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringTxs, setRecurringTxs] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Category Form State
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#94a3b8');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catCustomIcon, setCatCustomIcon] = useState<string | undefined>(undefined);

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
          setCatCustomIcon(canvas.toDataURL('image/png', 0.7));
          setCatIcon('Tag'); 
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

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
  
  // Recurring Form State
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecurringTransaction | null>(null);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'income' | 'expense'>('expense');
  const [recCategory, setRecCategory] = useState('');
  const [recAccountId, setRecAccountId] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurrenceFrequency>('monthly');
  const [recStartDate, setRecStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setCategories(getCategories());
    setRecurringTxs(loadRecurringTransactions());
    const data = loadData();
    setAccounts(data.accounts);
  };

  // Category Handlers
  const handleOpenCatDialog = (cat: Category | null = null) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatColor(cat.color || '#94a3b8');
      setCatIcon(cat.icon || 'Tag');
      setCatCustomIcon(cat.customIcon);
    } else {
      setEditingCat(null);
      setCatName('');
      setCatColor('#94a3b8');
      setCatIcon('Tag');
      setCatCustomIcon(undefined);
    }
    setIsCatDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (editingCat) {
      updateCategory({ ...editingCat, name: catName, color: catColor, icon: catIcon, customIcon: catCustomIcon });
      toast.success('Categoría actualizada');
    } else {
      addCategory(catName);
      const updatedCats = getCategories();
      const newCat = updatedCats.find(c => c.name === catName);
      if (newCat) {
        updateCategory({ ...newCat, color: catColor, icon: catIcon, customIcon: catCustomIcon });
      }
      toast.success('Categoría añadida');
    }
    
    refreshData();
    setIsCatDialogOpen(false);
  };

  const handleDeleteCat = (id: string) => {
    const res = deleteCategory(id);
    if (res.success) {
      toast.success('Categoría eliminada');
      refreshData();
    } else {
      toast.error(res.message);
    }
  };

  // Recurring Handlers
  const handleOpenRecDialog = (rec: RecurringTransaction | null = null) => {
    if (rec) {
      setEditingRec(rec);
      setRecName(rec.name);
      setRecAmount(rec.amount.toString());
      setRecType(rec.type);
      setRecCategory(rec.category);
      setRecAccountId(rec.accountId);
      setRecFrequency(rec.frequency);
      setRecStartDate(rec.startDate);
    } else {
      setEditingRec(null);
      setRecName('');
      setRecAmount('');
      setRecType('expense');
      setRecCategory(categories[0]?.name || '');
      setRecAccountId(accounts[0]?.id || '');
      setRecFrequency('monthly');
      setRecStartDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setIsRecDialogOpen(true);
  };

  const handleSaveRecurring = () => {
    if (!recName.trim() || !recAmount || !recCategory || !recAccountId) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const payload = {
      name: recName,
      amount: parseFloat(recAmount),
      type: recType,
      category: recCategory,
      accountId: recAccountId,
      frequency: recFrequency,
      startDate: recStartDate,
      isActive: editingRec ? editingRec.isActive : true,
    };

    if (editingRec) {
      updateRecurringTransaction({ ...editingRec, ...payload });
      processRecurringTransactions();
      toast.success('Automatización actualizada');
    } else {
      addRecurringTransaction(payload);
      processRecurringTransactions();
      toast.success('Automatización creada');
    }
    
    refreshData();
    setIsRecDialogOpen(false);
  };

  const handleDeleteRec = (id: string) => {
    deleteRecurringTransaction(id);
    toast.success('Automatización eliminada');
    refreshData();
  };

  const toggleRecStatus = (rec: RecurringTransaction) => {
    updateRecurringTransaction({ ...rec, isActive: !rec.isActive });
    processRecurringTransactions();
    refreshData();
  };

  return (
    <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20 pt-24">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CATEGORIES SECTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Categorías
              </h2>
              <Button size="sm" onClick={() => handleOpenCatDialog()} className="h-8 gap-1">
                <Plus className="w-4 h-4" />
                Nueva
              </Button>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        {(() => {
                           const IconComponent = (Icons as any)[cat.icon || 'Tag'] || Icons.Tag;
                           return (
                             <div 
                               className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                               style={{ backgroundColor: cat.color || '#94a3b8' }}
                             >
                               <IconComponent className="w-5 h-5" />
                             </div>
                           );
                        })()}
                        <div>
                          <p className="font-bold text-sm">{cat.name}</p>
                          {cat.monthlyLimit ? (
                             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Límite: {cat.monthlyLimit}€</p>
                          ) : (
                             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sin límite</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenCatDialog(cat)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => handleDeleteCat(cat.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* RECURRING SECTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Automatizaciones
              </h2>
              <Button size="sm" onClick={() => handleOpenRecDialog()} className="h-8 gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                <PlusCircle className="w-4 h-4" />
                Añadir Gasto Fijo
              </Button>
            </div>

            <div className="space-y-3">
              {recurringTxs.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground text-sm">No tienes gastos fijos configurados aún.</p>
                  </CardContent>
                </Card>
              ) : (
                recurringTxs.map((rec) => (
                  <Card key={rec.id} className={cn(
                    "border-none shadow-sm transition-all duration-300",
                    !rec.isActive && "opacity-60 grayscale"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                            rec.type === 'income' ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
                          )}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-sm">{rec.name}</p>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {rec.frequency === 'monthly' ? 'Mensual' : rec.frequency === 'weekly' ? 'Semanal' : 'Anual'} • {rec.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-black text-sm",
                            rec.type === 'income' ? "text-income" : "text-expense"
                          )}>
                            {rec.type === 'income' ? '+' : '-'}{rec.amount}€
                          </p>
                          <Switch 
                            checked={rec.isActive} 
                            onCheckedChange={() => toggleRecStatus(rec)}
                            className="scale-75 origin-right mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/30">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           Proyección Activa hasta {format(addMonths(new Date(), 12), 'MM/yy')}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenRecDialog(rec)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70" onClick={() => handleDeleteRec(rec.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

        </div>
      </div>

      {/* CATEGORY DIALOG */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
            <DialogDescription>Personaliza el nombre y color de tu categoría.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Nombre de la Categoría</Label>
              <Input id="catName" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ej: Supermercado" />
            </div>
            <div className="space-y-3">
              <Label>Icono Personalizado o Selector</Label>
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-muted hover:border-primary transition-all">
                <input 
                  type="file" 
                  id="catFileInput" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <button 
                  type="button"
                  onClick={() => document.getElementById('catFileInput')?.click()}
                  className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-primary"
                >
                  {catCustomIcon ? (
                    <img src={catCustomIcon} className="w-full h-full object-cover" alt="Custom icon preview" />
                  ) : (
                    <Icons.Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold">Subir foto</p>
                  <p className="text-[10px] text-muted-foreground">La imagen se ajustará automáticamente.</p>
                  {catCustomIcon && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setCatCustomIcon(undefined)}
                      className="h-auto p-0 text-destructive text-[10px]"
                    >
                      Quitar personalizada
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded-xl">
                {ICON_LIST.map((iconName) => {
                  const IconComp = (Icons as any)[iconName] || Icons.Tag;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        setCatIcon(iconName);
                        setCatCustomIcon(undefined);
                      }}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all hover:bg-muted",
                        catIcon === iconName && !catCustomIcon ? "border-primary bg-primary/5" : "border-transparent"
                      )}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catColor">Color</Label>
              <div className="flex gap-2 items-center">
                <Input id="catColor" type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="w-12 h-10 p-1" />
                <span className="text-xs font-mono text-muted-foreground">{catColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECURRING DIALOG */}
      <Dialog open={isRecDialogOpen} onOpenChange={setIsRecDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRec ? 'Editar Automatización' : 'Nueva Automatización'}</DialogTitle>
            <DialogDescription>Configura un gasto o ingreso que se genere solo periódicamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nombre / Concepto</Label>
                <Input value={recName} onChange={(e) => setRecName(e.target.value)} placeholder="Ej: Alquiler" />
              </div>
              <div className="space-y-2">
                <Label>Importe (€)</Label>
                <Input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={recType} onValueChange={(v: any) => setRecType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={recCategory} onValueChange={setRecCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cuenta</Label>
                <Select value={recAccountId} onValueChange={setRecAccountId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={recFrequency} onValueChange={(v: any) => setRecFrequency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input type="date" value={recStartDate} onChange={(e) => setRecStartDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRecurring}>Activar Automatización</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagementPage;
