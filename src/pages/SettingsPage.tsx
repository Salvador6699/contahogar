/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Laptop,
  Wrench,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Tag,
  Calendar,
  Wallet,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ChevronRight,
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
  CreditCard,
  Settings,
} from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  loadData,
} from "@/lib/storage";
import { Category, Account } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { AccountManager } from "@/components/AccountManager";
import { RecurringExpensesManager } from "@/components/RecurringExpensesManager";

const SettingsPage = () => {
  const { setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<
    "cuentas" | "categorias" | "apariencia" | "gastos_fijos"
  >("cuentas");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Category Form State
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#94a3b8");
  const [catIcon, setCatIcon] = useState("Tag");
  const [catCustomIcon, setCatCustomIcon] = useState<string | undefined>(
    undefined,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
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
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          setCatCustomIcon(canvas.toDataURL("image/png", 0.7));
          setCatIcon("Tag");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const ICON_LIST = [
    "Tag",
    "Wallet",
    "CreditCard",
    "Banknote",
    "PiggyBank",
    "ShoppingCart",
    "ShoppingBag",
    "ShoppingBasket",
    "Store",
    "Utensils",
    "Coffee",
    "Pizza",
    "Beer",
    "Wine",
    "Apple",
    "Beef",
    "Car",
    "Bus",
    "Train",
    "Plane",
    "Bike",
    "Fuel",
    "Home",
    "Smartphone",
    "Laptop",
    "Tv",
    "Zap",
    "Lightbulb",
    "Droplet",
    "Flame",
    "Heart",
    "Stethoscope",
    "Activity",
    "Dumbbell",
    "Gamepad2",
    "Music",
    "Film",
    "Dog",
    "Cat",
    "Baby",
    "Briefcase",
    "GraduationCap",
    "Ship",
    "Gift",
    "Wrench",
    "Hammer",
    "Settings",
    "Target",
    "Trophy",
    "Star",
    "Search",
    "Calendar",
    "Clock",
    "ShieldCheck",
    "Lock",
    "Bell",
    "Mail",
    "Phone",
    "Camera",
    "Map",
    "Headphones",
    "Wifi",
    "Thermometer",
    "Navigation",
    "Tree",
    "Flower",
    "Sun",
    "Moon",
    "Cloud",
    "HardDrive",
    "Monitor",
    "Tablet",
    "Watch",
    "Video",
    "Inbox",
    "Unlock",
    "Key",
    "Tool",
    "Trash",
    "Eye",
    "Image",
    "File",
    "Folder",
    "User",
    "Users",
    "Layout",
    "PieChart",
    "BarChart",
    "TrendingUp",
    "TrendingDown",
    "DollarSign",
    "Euro",
    "Award",
    "CheckCircle",
    "AlertTriangle",
  ];



  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setCategories(getCategories());
    const data = loadData();
    setAccounts(data.accounts);
  };

  // Category Handlers
  const handleOpenCatDialog = (cat: Category | null = null) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatColor(cat.color || "#94a3b8");
      setCatIcon(cat.icon || "Tag");
      setCatCustomIcon(cat.customIcon);
    } else {
      setEditingCat(null);
      setCatName("");
      setCatColor("#94a3b8");
      setCatIcon("Tag");
      setCatCustomIcon(undefined);
    }
    setIsCatDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (editingCat) {
      updateCategory({
        ...editingCat,
        name: catName,
        color: catColor,
        icon: catIcon,
        customIcon: catCustomIcon,
      });
      toast.success("Categoría actualizada");
    } else {
      addCategory(catName);
      const updatedCats = getCategories();
      const newCat = updatedCats.find((c) => c.name === catName);
      if (newCat) {
        updateCategory({
          ...newCat,
          color: catColor,
          icon: catIcon,
          customIcon: catCustomIcon,
        });
      }
      toast.success("Categoría añadida");
    }

    refreshData();
    setIsCatDialogOpen(false);
  };

  const handleDeleteCat = (id: string) => {
    const res = deleteCategory(id);
    if (res.success) {
      toast.success("Categoría eliminada");
      refreshData();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="w-full">
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-12 py-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Ajustes</h1>
            <p className="text-sm text-muted-foreground">
              Configura y personaliza la aplicación
            </p>
          </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button
            variant={activeTab === "cuentas" ? "default" : "outline"}
            onClick={() => setActiveTab("cuentas")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Cuentas
          </Button>
          <Button
            variant={activeTab === "categorias" ? "default" : "outline"}
            onClick={() => setActiveTab("categorias")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Tag className="w-4 h-4 mr-2" />
            Categorías
          </Button>

          <Button
            variant={activeTab === "gastos_fijos" ? "default" : "outline"}
            onClick={() => setActiveTab("gastos_fijos")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Clock className="w-4 h-4 mr-2" />
            Gastos Fijos
          </Button>

          <Button
            variant={activeTab === "apariencia" ? "default" : "outline"}
            onClick={() => setActiveTab("apariencia")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Sun className="w-4 h-4 mr-2" />
            Apariencia
          </Button>
        </div>

        <div className="space-y-6">
          {/* TAB: CUENTAS */}
          {activeTab === "cuentas" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AccountManager />
            </div>
          )}

          {/* TAB: GASTOS FIJOS */}
          {activeTab === "gastos_fijos" && (
            <RecurringExpensesManager />
          )}

          {/* TAB: CATEGORÍAS */}
          {activeTab === "categorias" && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Mis Categorías</h2>
                  <p className="text-sm text-muted-foreground">
                    Administra las categorías de tus transacciones.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenCatDialog()}
                  className="h-9 gap-1 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Nueva
                </Button>
              </div>

              <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          {(() => {
                            const IconComponent =
                              (Icons as any)[cat.icon || "Tag"] || Icons.Tag;
                            return (
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                                style={{
                                  backgroundColor: cat.color || "#94a3b8",
                                }}
                              >
                                <IconComponent className="w-6 h-6" />
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-bold text-base">{cat.name}</p>
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              Color:{" "}
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{
                                  backgroundColor: cat.color || "#94a3b8",
                                }}
                              />{" "}
                              {cat.color}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:bg-background"
                            onClick={() => handleOpenCatDialog(cat)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteCat(cat.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* TAB: APARIENCIA */}
          {activeTab === "apariencia" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sun className="w-5 h-5 text-income" />
                    Tema Visual
                  </CardTitle>
                  <CardDescription>
                    Elige cómo se ve la aplicación en tu dispositivo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 rounded-2xl"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="w-6 h-6" />
                    Claro
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 rounded-2xl"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="w-6 h-6" />
                    Oscuro
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 rounded-2xl"
                    onClick={() => setTheme("system")}
                  >
                    <Laptop className="w-6 h-6" />
                    Sistema
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="text-center py-8">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] opacity-50">
              ContaHogar v2.0
            </p>
          </div>
        </div>
      </div>

      {/* CATEGORY DIALOG (Global to this page) */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              Personaliza el nombre y color de tu categoría.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Nombre de la Categoría</Label>
              <Input
                id="catName"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ej: Supermercado"
              />
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
                  onClick={() =>
                    document.getElementById("catFileInput")?.click()
                  }
                  className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-primary"
                >
                  {catCustomIcon ? (
                    <img
                      src={catCustomIcon}
                      className="w-full h-full object-cover"
                      alt="Custom icon preview"
                    />
                  ) : (
                    <Icons.Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold">Subir foto</p>
                  <p className="text-[10px] text-muted-foreground">
                    La imagen se ajustará automáticamente.
                  </p>
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

              <div className="grid grid-cols-7 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded-xl custom-scrollbar">
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
                        catIcon === iconName && !catCustomIcon
                          ? "border-primary bg-primary/5"
                          : "border-transparent",
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
                <Input
                  id="catColor"
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {catColor}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
