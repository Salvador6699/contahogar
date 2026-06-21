import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  History, 
  Scale, 
  BarChart3, 
  ArrowLeftRight, 
  Book, 
  Wrench, 
  Settings,
  Menu,
  PlusCircle,
  X,
  CreditCard,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  Calendar,
  Search as SearchIcon,
  Target,
  PiggyBank,
  Zap
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn, withKeyboardClose } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { loadData, loadFavorites } from '@/lib/storage';
import { calculateCategorySummaries } from '@/lib/calculations';
import { FavoriteExpense, Category } from '@/types/finance';
import { format } from 'date-fns';

const MobileNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [favorites, setFavorites] = useState<FavoriteExpense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        setFavorites(loadFavorites());
        setCategories(loadData().categories);
    }, [location.pathname, location.search]);


    interface NavItem {
        icon: any;
        label: string;
        path: string;
        exact?: boolean;
    }

    const bottomNavItems: NavItem[] = [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: PiggyBank, label: 'Presupuestos', path: '/presupuestos' },
        { icon: Scale, label: 'Cuadrar', path: '/comparativa' },
    ];

    const allDrawerNavItems: NavItem[] = [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: Scale, label: 'Balance', path: '/comparativa' },
        { icon: ArrowLeftRight, label: 'Transf.', path: '/transferir' },
        { icon: SearchIcon, label: 'Buscar', path: '/buscar' },
        { icon: PiggyBank, label: 'Presupuestos', path: '/presupuestos' },
        { icon: History, label: 'Historial', path: '/historial' },
        { icon: Zap, label: 'Botones Rápidos', path: '/favorites' },
        { icon: Settings, label: 'Ajustes', path: '/ajustes' },
        { icon: ShieldCheck, label: 'Seguridad', path: '/backup' },
    ];

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const getPageDetails = () => {
        const current = allDrawerNavItems.find(item => {
            if (item.exact) return location.pathname === item.path;
            return location.pathname.startsWith(item.path);
        });
        
        if (location.pathname === '/') {
            return {
                title: 'Inicio',
                icon: null
            };
        }

        return {
            title: current?.label || 'ContaHogar',
            icon: current?.icon ? <current.icon className="w-6 h-6 text-primary" /> : null
        };
    };

    const { title, icon } = getPageDetails();

    const primaryNavPaths = ['/', '/comparativa', '/presupuestos', '/calendario', '/ahorro', '/historial', '/buscar'];
    const primaryNavItems = allDrawerNavItems.filter(item => primaryNavPaths.includes(item.path));
    const secondaryNavItems = allDrawerNavItems.filter(item => !primaryNavPaths.includes(item.path));

    return (
        <>
            {/* MOBILE HEADER (Only visible on small screens) */}
            <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-gradient-to-b from-background/95 via-background/80 to-transparent nav-blur-fade flex lg:hidden items-center justify-between px-4 transition-all duration-300">
                <div className="flex items-center gap-3">
                    {icon}
                    <h2 className="text-sm font-black tracking-[0.15em] text-foreground/80 uppercase">
                        {title}
                    </h2>
                </div>
            </header>

            {/* DESKTOP TOP NAVIGATION (Hidden on mobile) */}
            <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-20 bg-background/95 backdrop-blur-xl border-b border-border/10 items-center justify-between px-8 transition-all duration-300">
                {/* Brand / Logo */}
                <div 
                    className="flex items-center gap-3 cursor-pointer group" 
                    onClick={() => navigate('/')}
                >
                    <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                        <PiggyBank className="w-8 h-8 text-primary" />
                    </div>
                    <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">ContaHogar</span>
                </div>

                {/* Primary Navigation Links */}
                <nav className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                    {primaryNavItems.map(item => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <button 
                                key={item.path} 
                                onClick={() => navigate(item.path)} 
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all", 
                                    active 
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                                        : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", active && "stroke-[2.5px]")} />
                                {item.label}
                            </button>
                        );
                    })}
                    
                    {/* Secondary menu via Hover Dropdown */}
                    <div className="relative group/dropdown">
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm transition-all">
                            <Menu className="w-4 h-4" />
                            Más
                        </button>
                        
                        {/* Dropdown Content with Hover Dead-Zone Fix */}
                        <div className="absolute top-full right-0 pt-2 w-56 z-50 opacity-0 translate-y-2 pointer-events-none group-hover/dropdown:opacity-100 group-hover/dropdown:translate-y-0 group-hover/dropdown:pointer-events-auto transition-all duration-300">
                            <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-2 grid gap-1">
                                {secondaryNavItems.map(item => {
                                    const active = isActive(item.path, item.exact);
                                    return (
                                        <button 
                                            key={item.path} 
                                            onClick={() => navigate(item.path)} 
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left group/item", 
                                                active 
                                                    ? "bg-primary/10 text-primary" 
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <div className={cn("p-1.5 rounded-lg transition-colors", active ? "bg-primary/20" : "bg-background group-hover/item:bg-background shadow-sm border border-border/50")}>
                                                <item.icon className={cn("w-4 h-4", active && "stroke-[2.5px]")} />
                                            </div>
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    {favorites.length > 0 && (
                        <div className="relative group/quick">
                            <button className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm shadow-sm">
                                <Zap className="w-5 h-5 stroke-[2.5px]" /> Rápidos
                            </button>
                            <div className="absolute top-full right-0 pt-2 w-64 z-50 opacity-0 translate-y-2 pointer-events-none group-hover/quick:opacity-100 group-hover/quick:translate-y-0 group-hover/quick:pointer-events-auto transition-all duration-300">
                                <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-2 grid gap-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {favorites.map(fav => {
                                        const cat = categories.find(c => c.name === fav.category);
                                        const IconComponent = (Icons as any)[fav.icon || cat?.icon || 'Tag'] || Icons.Tag;
                                        return (
                                            <button 
                                                key={fav.id}
                                                onClick={() => navigate(`/?action=quick-expense&id=${fav.id}`)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all text-left group/item hover:bg-muted"
                                            >
                                                <div className="p-1.5 rounded-lg bg-background group-hover/item:bg-background shadow-sm border border-border/50 text-white" style={{ backgroundColor: cat?.color || '#3b82f6' }}>
                                                    <IconComponent className="w-4 h-4" />
                                                </div>
                                                <span className="truncate flex-1 text-muted-foreground group-hover/item:text-foreground">{fav.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={() => navigate('/?action=add-income')} 
                        className="flex items-center gap-2 bg-income/10 hover:bg-income hover:text-white text-income px-5 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm shadow-sm active:scale-95"
                    >
                        <ArrowUpCircle className="w-5 h-5 stroke-[2.5px]" /> Ingreso
                    </button>
                    <button 
                        onClick={() => navigate('/?action=add-expense')} 
                        className="flex items-center gap-2 bg-expense/10 hover:bg-expense hover:text-white text-expense px-5 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm shadow-sm active:scale-95"
                    >
                        <ArrowDownCircle className="w-5 h-5 stroke-[2.5px]" /> Gasto
                    </button>
                </div>
            </header>

            {/* BARRA INFERIOR MODERNA (Mobile Only) */}
            <Sheet>
                <nav className="fixed bottom-0 left-0 right-0 z-50 h-[72px] bg-gradient-to-t from-background/95 via-background/85 to-transparent nav-blur-fade px-2 pb-safe lg:hidden transition-all duration-300 border-t border-border/10">
                    <div className="grid h-full grid-cols-5 max-w-lg mx-auto items-center">
                        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center relative group h-full">
                            <div className={cn("p-2 rounded-xl transition-all duration-500", isActive('/', true) ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary")}>
                                <Home className={cn("w-5 h-5", isActive('/', true) && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn("text-[10px] font-bold mt-0.5", isActive('/', true) ? "text-primary" : "text-muted-foreground/50")}>Inicio</span>
                        </button>
                        
                        <button onClick={() => navigate('/presupuestos')} className="flex flex-col items-center justify-center relative group h-full">
                            <div className={cn("p-2 rounded-xl transition-all duration-500", isActive('/presupuestos') ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary")}>
                                <PiggyBank className={cn("w-5 h-5", isActive('/presupuestos') && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn("text-[10px] font-bold mt-0.5", isActive('/presupuestos') ? "text-primary" : "text-muted-foreground/50")}>Presup.</span>
                        </button>

                        {/* BOTÓN GIGANTE CENTRAL */}
                        <Drawer>
                            <DrawerTrigger asChild>
                                <div className="flex flex-col items-center justify-center h-full -mt-6">
                                    <button className="bg-primary text-primary-foreground rounded-full p-4 shadow-xl shadow-primary/30 active:scale-95 transition-transform">
                                        <Plus className="w-8 h-8 stroke-[3px]" />
                                    </button>
                                </div>
                            </DrawerTrigger>
                            <DrawerContent>
                                <DrawerHeader className="relative">
                                    <DrawerTitle className="text-center text-xl">¿Qué quieres añadir?</DrawerTitle>
                                    <DrawerClose asChild>
                                        <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </DrawerClose>
                                </DrawerHeader>
                                <div className="p-4 flex gap-4">
                                    <button 
                                        onClick={() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); navigate('/?action=add-expense'); }}
                                        className="flex-1 bg-expense/10 hover:bg-expense/20 border-2 border-expense/20 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors active:scale-95"
                                    >
                                        <ArrowDownCircle className="w-12 h-12 text-expense stroke-[2px]" />
                                        <span className="font-bold text-expense text-lg">Gasto</span>
                                    </button>
                                    <button 
                                        onClick={() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); navigate('/?action=add-income'); }}
                                        className="flex-1 bg-income/10 hover:bg-income/20 border-2 border-income/20 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors active:scale-95"
                                    >
                                        <ArrowUpCircle className="w-12 h-12 text-income stroke-[2px]" />
                                        <span className="font-bold text-income text-lg">Ingreso</span>
                                    </button>
                                </div>
                                <div className="px-4 pb-12 max-h-[40vh] overflow-y-auto custom-scrollbar">
                                    {favorites.length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between mb-4 mt-2 border-t border-border/10 pt-4">
                                                <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-primary" /> Gastos Rápidos
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {favorites.map(fav => {
                                                    const cat = categories.find(c => c.name === fav.category);
                                                    const IconComponent = (Icons as any)[fav.icon || cat?.icon || 'Tag'] || Icons.Tag;
                                                    return (
                                                        <DrawerClose asChild key={fav.id}>
                                                            <button 
                                                                onClick={() => navigate(`/?action=quick-expense&id=${fav.id}`)}
                                                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:bg-muted/50 active:scale-95 transition-all"
                                                            >
                                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cat?.color || '#3b82f6' }}>
                                                                    <IconComponent className="w-5 h-5" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-center leading-tight">{fav.name}</span>
                                                            </button>
                                                        </DrawerClose>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </DrawerContent>
                        </Drawer>

                        <button onClick={() => navigate('/comparativa')} className="flex flex-col items-center justify-center relative group h-full">
                            <div className={cn("p-2 rounded-xl transition-all duration-500", isActive('/comparativa') ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary")}>
                                <Scale className={cn("w-5 h-5", isActive('/comparativa') && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn("text-[10px] font-bold mt-0.5", isActive('/comparativa') ? "text-primary" : "text-muted-foreground/50")}>Cuadrar</span>
                        </button>

                        <SheetTrigger asChild>
                            <button className="flex flex-col items-center justify-center relative group h-full">
                                <div className="p-2 rounded-xl text-muted-foreground/60 group-hover:text-primary transition-all duration-500 relative">
                                    <Menu className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold mt-0.5 text-muted-foreground/50">Menú</span>
                            </button>
                        </SheetTrigger>
                    </div>
                </nav>

                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border/20 bg-background/95 backdrop-blur-3xl p-0 flex flex-col lg:hidden">
                    <SheetHeader className="p-6 border-b border-border/10 shrink-0">
                        <SheetTitle className="text-2xl font-black flex items-center justify-center gap-3 tracking-tighter">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Menu className="w-6 h-6 text-primary" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">Menú Principal</span>
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar grid grid-cols-2 gap-3 content-start">
                        {allDrawerNavItems.map((item) => {
                            const active = isActive(item.path, item.exact);
                            return (
                                <SheetClose asChild key={item.path}>
                                    <button
                                        onClick={() => navigate(item.path)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300 font-bold group w-full text-center border",
                                            active 
                                                ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                                                : "bg-card text-muted-foreground hover:bg-primary/5 hover:text-primary border-border/50 active:scale-95"
                                        )}
                                    >
                                        <div className="relative">
                                            <item.icon className={cn("w-6 h-6", active && "stroke-[2.5px]")} />
                                        </div>
                                        <span className="text-xs uppercase tracking-[0.1em]">{item.label}</span>
                                    </button>
                                </SheetClose>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default MobileNav;
