import { useState, useEffect, useRef } from "react";
import { useSearchParams } from '@/hooks/useSearchParams';
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
  Users,
  Bell
} from "lucide-react";
import { PushSettingsCard } from "@/components/PushPermissionBanner";
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
  Category,
  CategoryKind,
  CategoryNature,
  CATEGORY_KIND_LABELS,
  CATEGORY_NATURE_LABELS,
  getCategoryKind,
  getCategoryNature,
} from "@/types/finance";
import { appToast as toast } from "@/lib/swal";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { AccountManager } from "@/components/AccountManager";
import { CategoryMigrationDialog } from "@/components/CategoryMigrationDialog";
import { TagManager } from "@/components/TagManager";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { FEATURE_FLAG_DEFINITIONS } from "@/lib/featureFlags";
import { Badge } from "@/components/ui/badge";

const SettingsPage = () => {
  const { setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const { flags, toggleFlag, resetAll: resetFeatureFlags } = useFeatureFlags();

  const [activeTab, setActiveTab] = useState<
    "cuentas" | "categorias" | "etiquetas" | "notificaciones" | "apariencia"
  >(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "cuentas" ||
      tabParam === "categorias" ||
      tabParam === "etiquetas" ||
      tabParam === "notificaciones" ||
      tabParam === "apariencia"
    ) {
      return tabParam as any;
    }
    return "cuentas";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "cuentas" ||
      tabParam === "categorias" ||
      tabParam === "etiquetas" ||
      tabParam === "notificaciones" ||
      tabParam === "apariencia"
    ) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const { accounts } = useAccounts();
  const {
    categories,
    addCategory: rqAddCategory,
    updateCategory: rqUpdateCategory,
    mergeCategories: rqMergeCategories,
    deleteCategory: rqDeleteCategory,
    isMerging,
  } = useCategories();

  const [isForcingUpdate, setIsForcingUpdate] = useState(false);

  const handleForceAppUpdate = async () => {
    if (isForcingUpdate) return;
    setIsForcingUpdate(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            await registration.update().catch(() => {});
            await registration.unregister().catch(() => {});
          }),
        );
      }
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      window.location.reload();
    } catch {
      setIsForcingUpdate(false);
      toast.error("No se pudo limpiar la caché automáticamente");
    }
  };

  // Category Form State
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#94a3b8");
  const [catIcon, setCatIcon] = useState("Tag");
  const [catCustomIcon, setCatCustomIcon] = useState<string | undefined>(
    undefined,
  );
  const [catIsGroup, setCatIsGroup] = useState(false);
  const [catParentId, setCatParentId] = useState<string>("none");
  const [catKind, setCatKind] = useState<CategoryKind>("expense");
  const [catNature, setCatNature] = useState<CategoryNature>("essential");
  const [catIsArchived, setCatIsArchived] = useState(false);

  // Category list filters & Merge dialog state
  const [catSearch, setCatSearch] = useState("");
  const [showArchivedCats, setShowArchivedCats] = useState(false);
  const [mergeSourceCat, setMergeSourceCat] = useState<Category | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);

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
    "Trees",
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
    "Landmark",
    "Building2",
    "Receipt",
    "Sparkles",
    "Trash2",
    "ArrowLeftRight",
    "Repeat",
    "Smile",
    "Brain",
    "Shirt",
    "Puzzle",
    "Clover",
    "Ticket",
    "Cigarette",
    "HandHeart",
    "Globe",
    "BookOpen",
    "Scissors",
    "SprayCan",
    "Coins",
  ];

  // Derived category groups & helpers
  const categoryGroups = categories
    .filter((c) => Boolean(c.isGroup))
    .sort((a, b) => a.name.localeCompare(b.name));

  const nonGroupCategories = categories.filter((c) => !c.isGroup);
  const archivedCount = categories.filter((c) => Boolean(c.isArchived)).length;

  const matchesSearch = (c: Category) => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q);
  };

  const isVisibleCategory = (c: Category) =>
    (showArchivedCats || !c.isArchived) && matchesSearch(c);

  const getNatureBadgeClass = (nature: CategoryNature | null) => {
    switch (nature) {
      case "essential":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "discretionary":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
      case "debt":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
      case "extraordinary":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/50";
    }
  };

  const getKindBadgeClass = (kind: CategoryKind) => {
    switch (kind) {
      case "income":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "financing":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
      default:
        return "bg-muted/80 text-muted-foreground border-border/50";
    }
  };

  // Category Handlers
  const handleOpenCatDialog = (
    cat: Category | null = null,
    defaults?: { isGroup?: boolean; parentId?: string }
  ) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatColor(cat.color || "#94a3b8");
      setCatIcon(cat.icon || "Tag");
      setCatCustomIcon(cat.customIcon);
      setCatIsGroup(Boolean(cat.isGroup));
      setCatParentId(cat.parentId || "none");
      setCatKind(getCategoryKind(cat, categories));
      setCatNature(getCategoryNature(cat, categories) || "essential");
      setCatIsArchived(Boolean(cat.isArchived));
    } else {
      const parentGroup = defaults?.parentId
        ? categories.find((c) => c.id === defaults.parentId)
        : undefined;
      setEditingCat(null);
      setCatName("");
      setCatColor(parentGroup?.color || "#94a3b8");
      setCatIcon(defaults?.isGroup ? "Folder" : "Tag");
      setCatCustomIcon(undefined);
      setCatIsGroup(Boolean(defaults?.isGroup));
      setCatParentId(defaults?.parentId || "none");
      setCatKind(parentGroup?.kind || "expense");
      setCatNature(parentGroup?.nature || "essential");
      setCatIsArchived(false);
    }
    setIsCatDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const trimmed = catName.trim();
    if (!trimmed) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const parentIdValue = catIsGroup || catParentId === "none" ? null : catParentId;
    const natureValue: CategoryNature | null = catKind === "expense" ? catNature : null;

    try {
      if (editingCat) {
        await rqUpdateCategory({
          ...editingCat,
          name: trimmed,
          color: catColor,
          icon: catIcon,
          customIcon: catCustomIcon,
          isGroup: catIsGroup,
          parentId: parentIdValue,
          kind: catKind,
          nature: natureValue,
          isArchived: catIsArchived,
        });
        toast.success(catIsGroup ? "Grupo actualizado" : "Categoría actualizada");
      } else {
        await rqAddCategory({
          name: trimmed,
          color: catColor,
          icon: catIcon,
          customIcon: catCustomIcon,
          isGroup: catIsGroup,
          parentId: parentIdValue,
          kind: catKind,
          nature: natureValue,
          isArchived: catIsArchived,
        });
        toast.success(catIsGroup ? "Grupo creado" : "Categoría creada");
      }
      setIsCatDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar la categoría");
    }
  };

  const handleToggleArchiveCategory = async (cat: Category) => {
    try {
      await rqUpdateCategory({
        ...cat,
        isArchived: !cat.isArchived,
      });
      toast.success(cat.isArchived ? "Categoría restaurada" : "Categoría archivada");
    } catch (e: any) {
      toast.error(e.message || "Error al archivar la categoría");
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergeSourceCat || !mergeTargetId) {
      toast.error("Selecciona una categoría destino");
      return;
    }
    try {
      const res = await rqMergeCategories({
        sourceId: mergeSourceCat.id,
        targetId: mergeTargetId,
      });
      toast.success(`"${res.sourceName}" fusionada en "${res.targetName}"`);
      setMergeSourceCat(null);
      setMergeTargetId("");
    } catch (e: any) {
      toast.error(e.message || "Error al fusionar categorías");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await rqDeleteCategory(id);
      toast.success("Categoría eliminada");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const editingGroupHasChildren = Boolean(
    editingCat?.isGroup &&
      categories.some((c) => c.parentId === editingCat.id)
  );

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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          <Button
            variant={activeTab === "cuentas" ? "default" : "outline"}
            onClick={() => setActiveTab("cuentas")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Wallet className="w-4 h-4 mr-2" />
            <span>Cuentas</span>
          </Button>
          <Button
            variant={activeTab === "categorias" ? "default" : "outline"}
            onClick={() => setActiveTab("categorias")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Tag className="w-4 h-4 mr-2" />
            <span>Categorías</span>
          </Button>
          <Button
            variant={activeTab === "etiquetas" ? "default" : "outline"}
            onClick={() => setActiveTab("etiquetas")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Icons.Hash className="w-4 h-4 mr-2" />
            <span>Etiquetas</span>
          </Button>
          <Button
            variant={activeTab === "notificaciones" ? "default" : "outline"}
            onClick={() => setActiveTab("notificaciones")}
            className="w-full flex items-center justify-center rounded-xl"
          >
            <Bell className="w-4 h-4 mr-2" />
            <span>Alertas</span>
          </Button>
          <Button
            variant={activeTab === "apariencia" ? "default" : "outline"}
            onClick={() => setActiveTab("apariencia")}
            className="w-full flex items-center justify-center rounded-xl col-span-2 sm:col-span-1"
          >
            <Sun className="w-4 h-4 mr-2" />
            <span>Apariencia</span>
          </Button>
        </div>

        <div className="space-y-6">
          {/* TAB: NOTIFICACIONES */}
          {activeTab === "notificaciones" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <PushSettingsCard />
            </div>
          )}

          {/* TAB: CUENTAS */}
          {activeTab === "cuentas" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AccountManager />
            </div>
          )}

          {/* TAB: ETIQUETAS */}
          {activeTab === "etiquetas" && <TagManager />}


          {/* TAB: CATEGORÍAS */}
          {activeTab === "categorias" && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Mis Categorías</h2>
                  <p className="text-sm text-muted-foreground">
                    Organiza tus categorías en Grupos (Nivel 1) y Subcategorías (Nivel 2), con su tipo y naturaleza contable.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsMigrationOpen(true)}
                    className="h-9 gap-1.5 rounded-xl"
                  >
                    <Icons.Sparkles className="w-4 h-4 text-primary" />
                    Asistente contable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCatDialog(null, { isGroup: true })}
                    className="h-9 gap-1.5 rounded-xl"
                  >
                    <Icons.FolderPlus className="w-4 h-4" />
                    Nuevo Grupo
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenCatDialog(null, { isGroup: false })}
                    className="h-9 gap-1.5 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva
                  </Button>
                </div>
              </div>

              {/* Search & Archived filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Icons.Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Buscar grupo o categoría..."
                    className="pl-9 h-9 rounded-xl"
                  />
                </div>
                {archivedCount > 0 && (
                  <Button
                    type="button"
                    variant={showArchivedCats ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowArchivedCats((v) => !v)}
                    className="h-9 rounded-xl gap-1.5 shrink-0"
                  >
                    <Icons.Archive className="w-4 h-4" />
                    {showArchivedCats ? "Ocultar archivadas" : `Ver archivadas (${archivedCount})`}
                  </Button>
                )}
              </div>

              {/* Helper renderer for a single category row */}
              {(() => {
                const renderCategoryIcon = (cat: Category, size: "md" | "sm" = "md") => {
                  const boxClass = size === "md" ? "w-10 h-10 rounded-xl" : "w-9 h-9 rounded-xl";
                  const iconClass = size === "md" ? "w-5 h-5" : "w-4 h-4";
                  if (cat.customIcon) {
                    return (
                      <div className={cn(boxClass, "overflow-hidden shadow-sm border border-border/50 shrink-0")}>
                        <img src={cat.customIcon} alt={cat.name} className="w-full h-full object-cover" />
                      </div>
                    );
                  }
                  const IconComponent = (Icons as any)[cat.icon || (cat.isGroup ? "Folder" : "Tag")] || Icons.Tag;
                  return (
                    <div
                      className={cn(boxClass, "flex items-center justify-center text-white shadow-sm shrink-0")}
                      style={{ backgroundColor: cat.color || "#94a3b8" }}
                    >
                      <IconComponent className={iconClass} />
                    </div>
                  );
                };

                const renderSubcategoryRow = (cat: Category) => {
                  const effKind = getCategoryKind(cat, categories);
                  const effNature = effKind === "expense" ? getCategoryNature(cat, categories) : null;
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/30 transition-colors",
                        cat.isArchived && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderCategoryIcon(cat, "sm")}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-sm truncate">{cat.name}</p>
                            {cat.isArchived && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                Archivada
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {effKind !== "expense" && (
                              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", getKindBadgeClass(effKind))}>
                                {CATEGORY_KIND_LABELS[effKind]}
                              </Badge>
                            )}
                            {effNature && (
                              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", getNatureBadgeClass(effNature))}>
                                {CATEGORY_NATURE_LABELS[effNature]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Fusionar en otra categoría"
                          onClick={() => {
                            setMergeSourceCat(cat);
                            setMergeTargetId("");
                          }}
                        >
                          <Icons.GitMerge className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-background"
                          title={cat.isArchived ? "Restaurar categoría" : "Archivar categoría"}
                          onClick={() => handleToggleArchiveCategory(cat)}
                        >
                          {cat.isArchived ? (
                            <Icons.ArchiveRestore className="w-4 h-4" />
                          ) : (
                            <Icons.Archive className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-background"
                          title="Editar"
                          onClick={() => handleOpenCatDialog(cat)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                };

                const ungroupedCats = nonGroupCategories
                  .filter((c) => !c.parentId || !categoryGroups.some((g) => g.id === c.parentId))
                  .filter(isVisibleCategory);

                return (
                  <div className="space-y-4">
                    {/* Grupos (Nivel 1) con sus Subcategorías (Nivel 2) */}
                    {categoryGroups.map((group) => {
                      const children = nonGroupCategories
                        .filter((c) => c.parentId === group.id)
                        .filter(isVisibleCategory);
                      const groupVisible = isVisibleCategory(group) || children.length > 0;
                      if (!groupVisible) return null;

                      const groupKind = group.kind || "expense";
                      const groupNature = groupKind === "expense" ? (group.nature ?? null) : null;

                      return (
                        <Card key={group.id} className="border border-border/60 shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm">
                          <div className="flex items-center justify-between gap-2 p-3.5 bg-muted/40 border-b border-border/50">
                            <div className="flex items-center gap-3 min-w-0">
                              {renderCategoryIcon(group, "md")}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-extrabold text-sm sm:text-base truncate">{group.name}</p>
                                  <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", getKindBadgeClass(groupKind))}>
                                    {CATEGORY_KIND_LABELS[groupKind]}
                                  </Badge>
                                  {groupNature && (
                                    <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", getNatureBadgeClass(groupNature))}>
                                      {CATEGORY_NATURE_LABELS[groupNature]}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {children.length} {children.length === 1 ? "subcategoría" : "subcategorías"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                                title="Añadir subcategoría a este grupo"
                                onClick={() => handleOpenCatDialog(null, { isGroup: false, parentId: group.id })}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Subcategoría</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-background"
                                title="Editar grupo"
                                onClick={() => handleOpenCatDialog(group)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Eliminar grupo"
                                onClick={() => handleDeleteCategory(group.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {children.length > 0 ? (
                            <div className="divide-y divide-border/40 pl-2 sm:pl-4">
                              {children.map(renderSubcategoryRow)}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground px-4 py-3 italic">
                              Sin subcategorías asignadas todavía.
                            </p>
                          )}
                        </Card>
                      );
                    })}

                    {/* Categorías sin grupo asignado */}
                    {ungroupedCats.length > 0 && (
                      <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                        {categoryGroups.length > 0 && (
                          <div className="px-4 py-2.5 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Sin grupo asignado ({ungroupedCats.length})
                            </span>
                          </div>
                        )}
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/50">
                            {ungroupedCats.map(renderSubcategoryRow)}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {categoryGroups.length === 0 && ungroupedCats.length === 0 && (
                      <Card className="border-none shadow-sm bg-card/50 p-8 text-center text-sm text-muted-foreground">
                        No se encontraron categorías con el filtro actual.
                      </Card>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* TAB: APARIENCIA */}
          {activeTab === "apariencia" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icons.Sparkles className="w-5 h-5 text-primary" />
                    Modo Simple (Solo apuntar gastos)
                  </CardTitle>
                  <CardDescription>
                    Una página sin menús ni gráficas pensada para quien solo quiera apuntar gastos rápido (importe, banco o efectivo y categoría).
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="default"
                    className="rounded-xl flex-1"
                    onClick={async () => {
                      const url = `${window.location.origin}/gasto`;
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success("Enlace copiado", url);
                      } catch {
                        toast.info("Enlace de acceso rápido", url);
                      }
                    }}
                  >
                    <Icons.Copy className="w-4 h-4 mr-2" />
                    Copiar enlace (/gasto)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      window.open("/gasto", "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Icons.ExternalLink className="w-4 h-4 mr-2" />
                    Abrir vista simple
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icons.FlaskConical className="w-5 h-5 text-primary" />
                      Laboratorio (Experimental)
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        resetFeatureFlags();
                        toast.success("Experimentos restablecidos");
                      }}
                      className="h-8 text-xs text-muted-foreground"
                    >
                      Restablecer todo
                    </Button>
                  </div>
                  <CardDescription>
                    Activa o desactiva funciones en prueba. Solo afectan a este dispositivo y puedes revertirlas al instante sin tocar tus datos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {FEATURE_FLAG_DEFINITIONS.map((def) => {
                    const enabled = Boolean(flags[def.key]);
                    return (
                      <div
                        key={def.key}
                        className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-border/50 bg-background/60"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{def.label}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {def.risk}
                            </Badge>
                            {enabled && (
                              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                Activo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {def.description}
                          </p>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => {
                            toggleFlag(def.key, checked);
                            toast.success(
                              checked
                                ? `${def.label} activado`
                                : `${def.label} desactivado`
                            );
                          }}
                          aria-label={def.label}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="text-center py-8 space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] opacity-50">
              ContaHogar v2.0
            </p>
            {typeof window !== "undefined" && (
              <p className="text-[11px] font-mono text-muted-foreground/70">
                Dominio: {window.location.hostname}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isForcingUpdate}
              onClick={handleForceAppUpdate}
              className="rounded-xl text-xs gap-1.5"
            >
              <Icons.RefreshCw className={cn("w-3.5 h-3.5", isForcingUpdate && "animate-spin")} />
              {isForcingUpdate ? "Actualizando..." : "Actualizar app (limpiar caché)"}
            </Button>
          </div>
        </div>
      </div>

      {/* CATEGORY DIALOG (Global to this page) */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCat
                ? catIsGroup
                  ? "Editar Grupo"
                  : "Editar Categoría"
                : catIsGroup
                  ? "Nuevo Grupo (Nivel 1)"
                  : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              Define el nivel jerárquico, clasificación contable, icono y color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="catName">Nombre</Label>
              <Input
                id="catName"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder={catIsGroup ? "Ej: Vivienda" : "Ej: Supermercado"}
              />
            </div>

            {/* Nivel jerárquico */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="space-y-0.5">
                <Label htmlFor="catIsGroupSwitch" className="text-sm font-semibold">
                  Es un Grupo padre (Nivel 1)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {editingGroupHasChildren
                    ? "Este grupo contiene subcategorías y no puede convertirse en subcategoría."
                    : "Los grupos agrupan subcategorías en informes y presupuestos."}
                </p>
              </div>
              <Switch
                id="catIsGroupSwitch"
                checked={catIsGroup}
                disabled={editingGroupHasChildren}
                onCheckedChange={(checked) => {
                  setCatIsGroup(checked);
                  if (checked) setCatParentId("none");
                }}
              />
            </div>

            {/* Selector de Grupo padre (solo para subcategorías) */}
            {!catIsGroup && (
              <div className="space-y-2">
                <Label>Grupo padre (Nivel 1)</Label>
                <Select
                  value={catParentId}
                  onValueChange={(val) => {
                    setCatParentId(val);
                    if (val !== "none") {
                      const parent = categoryGroups.find((g) => g.id === val);
                      if (parent?.kind) setCatKind(parent.kind);
                      if (parent?.nature) setCatNature(parent.nature);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sin grupo asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo asignado</SelectItem>
                    {categoryGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tipo de flujo y Naturaleza */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de flujo</Label>
                <Select
                  value={catKind}
                  onValueChange={(v) => setCatKind(v as CategoryKind)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{CATEGORY_KIND_LABELS.expense}</SelectItem>
                    <SelectItem value="income">{CATEGORY_KIND_LABELS.income}</SelectItem>
                    <SelectItem value="financing">{CATEGORY_KIND_LABELS.financing}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {catKind === "expense" && (
                <div className="space-y-2">
                  <Label>Naturaleza del gasto</Label>
                  <Select
                    value={catNature}
                    onValueChange={(v) => setCatNature(v as CategoryNature)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essential">{CATEGORY_NATURE_LABELS.essential}</SelectItem>
                      <SelectItem value="discretionary">{CATEGORY_NATURE_LABELS.discretionary}</SelectItem>
                      <SelectItem value="debt">{CATEGORY_NATURE_LABELS.debt}</SelectItem>
                      <SelectItem value="extraordinary">{CATEGORY_NATURE_LABELS.extraordinary}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!catIsGroup && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="space-y-0.5">
                  <Label htmlFor="catArchivedSwitch" className="text-sm font-semibold">
                    Archivar categoría
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Oculta esta categoría al registrar nuevos gastos, manteniendo su histórico intacto.
                  </p>
                </div>
                <Switch
                  id="catArchivedSwitch"
                  checked={catIsArchived}
                  onCheckedChange={setCatIsArchived}
                />
              </div>
            )}

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

      {/* MERGE CATEGORY DIALOG */}
      <Dialog
        open={Boolean(mergeSourceCat)}
        onOpenChange={(open) => {
          if (!open) {
            setMergeSourceCat(null);
            setMergeTargetId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icons.GitMerge className="w-5 h-5 text-primary" />
              Fusionar categoría
            </DialogTitle>
            <DialogDescription>
              Todas las transacciones, presupuestos, gastos fijos, metas y favoritos de{" "}
              <strong className="text-foreground">"{mergeSourceCat?.name}"</strong> pasarán a la
              categoría destino y se eliminará la categoría origen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-2">
              <Label>Categoría destino</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Elige la categoría destino..." />
                </SelectTrigger>
                <SelectContent>
                  {nonGroupCategories
                    .filter((c) => c.id !== mergeSourceCat?.id)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMergeSourceCat(null);
                setMergeTargetId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!mergeTargetId || isMerging}
              onClick={handleConfirmMerge}
            >
              {isMerging ? "Fusionando..." : "Confirmar fusión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CategoryMigrationDialog
        open={isMigrationOpen}
        onOpenChange={setIsMigrationOpen}
      />
    </div>
  );
};

export default SettingsPage;
