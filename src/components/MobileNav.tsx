import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  History, 
  Scale, 
  BarChart3, 
  PiggyBank, 
  Settings, 
  ArrowLeftRight, 
  Book, 
  Wrench, 
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
  Target
} from 'lucide-react';
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
import { loadData } from '@/lib/storage';
import { calculateCategorySummaries, calculateBudgetAlerts } from '@/lib/calculations';
import { useMemo } from 'react';
import { format } from 'date-fns';

const MobileNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Calculate alerts for the red badge
    const hasBudgetAlerts = useMemo(() => {
        try {
            const data = loadData();
            const currentMonth = format(new Date(), 'yyyy-MM');
            const monthTxs = data.transactions.filter(t => t.date.startsWith(currentMonth));
            const categorySummaries = calculateCategorySummaries(monthTxs, 'expense');
            const budgets = (data.budgets || []).filter(b => b.month === currentMonth);
            
            const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            const { hasAlerts } = calculateBudgetAlerts(
                budgets, 
                categorySummaries, 
                totalIncome, 
                totalExpenses,
                data.alertSettings
            );
            return hasAlerts;
        } catch (e) {
            return false;
        }
    }, [location.pathname]);

    interface NavItem {
        icon: any;
        label: string;
        path: string;
        exact?: boolean;
    }

    const bottomNavItems: NavItem[] = [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: Scale, label: 'Cuadrar', path: '/comparativa' },
        { icon: ArrowLeftRight, label: 'Transf.', path: '/transferir' },
    ];

    const allDrawerNavItems: NavItem[] = [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: Scale, label: 'Balance', path: '/comparativa' },
        { icon: ArrowLeftRight, label: 'Transf.', path: '/transferir' },
        { icon: Calendar, label: 'Calendario', path: '/calendario' },
        { icon: Target, label: 'Ahorro', path: '/ahorro' },
        { icon: SearchIcon, label: 'Buscar', path: '/buscar' },
        { icon: History, label: 'Historial', path: '/historial' },
        { icon: BarChart3, label: 'Medias', path: '/medias' },
        { icon: Wrench, label: 'Gestión', path: '/gestion' },
        { icon: PiggyBank, label: 'Presupuestos', path: '/presupuestos' },
        { icon: Settings, label: 'Ajustes', path: '/ajustes' },
        { icon: ShieldCheck, label: 'Seguridad', path: '/backup' },
        { icon: Book, label: 'Guía', path: '/guia' },
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

    return (
        <>
            {/* Cabecera Fija Superior Dinámica - Compacta & Glassmorphism */}
            <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-gradient-to-b from-background/95 via-background/80 to-transparent nav-blur-fade flex items-center justify-between px-4 lg:pl-24 transition-all duration-300">
                <div className="flex items-center gap-3">
                    {icon}
                    <h2 className="text-sm font-black tracking-[0.15em] text-foreground/80 uppercase">
                        {title}
                    </h2>
                </div>
            </header>

            {/* BARRA INFERIOR MODERNA - Menú Accesible con Pulgar */}
            <Sheet>
                <nav className="fixed bottom-0 left-0 right-0 z-50 h-[72px] bg-gradient-to-t from-background/95 via-background/85 to-transparent nav-blur-fade px-2 pb-safe lg:hidden transition-all duration-300 border-t border-border/10">
                    <div className="grid h-full grid-cols-5 max-w-lg mx-auto items-center">
                        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center relative group h-full">
                            <div className={cn("p-2 rounded-xl transition-all duration-500", isActive('/', true) ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary")}>
                                <Home className={cn("w-5 h-5", isActive('/', true) && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn("text-[10px] font-bold mt-0.5", isActive('/', true) ? "text-primary" : "text-muted-foreground/50")}>Inicio</span>
                        </button>
                        
                        <button onClick={() => navigate('/comparativa')} className="flex flex-col items-center justify-center relative group h-full">
                            <div className={cn("p-2 rounded-xl transition-all duration-500", isActive('/comparativa') ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary")}>
                                <Scale className={cn("w-5 h-5", isActive('/comparativa') && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn("text-[10px] font-bold mt-0.5", isActive('/comparativa') ? "text-primary" : "text-muted-foreground/50")}>Balance</span>
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
                                <DrawerHeader>
                                    <DrawerTitle className="text-center text-xl">¿Qué quieres añadir?</DrawerTitle>
                                </DrawerHeader>
                                <div className="p-4 flex gap-4 pb-12">
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
                            </DrawerContent>
                        </Drawer>

                        <button onClick={() => navigate('/calendario')} className="flex flex-col items-center justify-center relative group h-full">
                            <div className={cn("p-2 rounded-xl transition-all duration-500", isActive('/calendario') ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary")}>
                                <Calendar className={cn("w-5 h-5", isActive('/calendario') && "stroke-[2.5px]")} />
                            </div>
                            <span className={cn("text-[10px] font-bold mt-0.5", isActive('/calendario') ? "text-primary" : "text-muted-foreground/50")}>Fechas</span>
                        </button>

                        <SheetTrigger asChild>
                            <button className="flex flex-col items-center justify-center relative group h-full">
                                <div className="p-2 rounded-xl text-muted-foreground/60 group-hover:text-primary transition-all duration-500 relative">
                                    <Menu className="w-5 h-5" />
                                    {hasBudgetAlerts && (
                                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
                                    )}
                                </div>
                                <span className="text-[10px] font-bold mt-0.5 text-muted-foreground/50">Menú</span>
                            </button>
                        </SheetTrigger>
                    </div>
                </nav>

                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border/20 bg-background/95 backdrop-blur-3xl p-0 flex flex-col">
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
                                            {item.label === 'Presupuestos' && hasBudgetAlerts && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background animate-pulse" />
                                            )}
                                        </div>
                                        <span className="text-xs uppercase tracking-[0.1em]">{item.label}</span>
                                    </button>
                                </SheetClose>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            {/* SIDEBAR ESCRITORIO CON ACCESO DIRECTO */}
            <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-20 flex-col bg-gradient-to-r from-background/95 to-background/60 backdrop-blur-3xl border-r border-border/10 py-10 items-center gap-8 shadow-[4px_0_30px_rgba(0,0,0,0.02)] pt-28">
                {bottomNavItems.map((item) => {
                    const active = isActive(item.path, item.exact);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 group relative",
                                active 
                                    ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-110" 
                                    : "text-muted-foreground/60 hover:bg-primary/5 hover:text-primary active:scale-95"
                            )}
                            title={item.label}
                        >
                            <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
                            {active && (
                                <div className="absolute -left-1 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                            )}
                        </button>
                    );
                })}

                <button
                    onClick={() => navigate('/calendario')}
                    className={cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 group relative",
                        isActive('/calendario') 
                            ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-110" 
                            : "text-muted-foreground/60 hover:bg-primary/5 hover:text-primary active:scale-95"
                    )}
                    title="Calendario"
                >
                    <Calendar className="w-5 h-5" />
                    {isActive('/calendario') && (
                        <div className="absolute -left-1 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                    )}
                </button>

                <button
                    onClick={() => navigate('/ahorro')}
                    className={cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 group relative",
                        isActive('/ahorro') 
                            ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-110" 
                            : "text-muted-foreground/60 hover:bg-primary/5 hover:text-primary active:scale-95"
                    )}
                    title="Metas de Ahorro"
                >
                    <Target className="w-5 h-5" />
                    {isActive('/ahorro') && (
                        <div className="absolute -left-1 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                    )}
                </button>
                
                <div className="w-8 h-[1px] bg-border/20 my-2" />

                <button
                    onClick={() => navigate('/?action=add-expense')}
                    className="flex items-center justify-center w-12 h-12 rounded-2xl bg-expense/10 text-expense hover:bg-expense hover:text-white transition-all duration-300 shadow-xl shadow-expense/5 active:scale-90"
                    title="Añadir Gasto"
                >
                    <ArrowDownCircle className="w-6 h-6 stroke-[2px]" />
                </button>
                <button
                    onClick={() => navigate('/?action=add-income')}
                    className="flex items-center justify-center w-12 h-12 rounded-2xl bg-income/10 text-income hover:bg-income hover:text-white transition-all duration-300 shadow-xl shadow-income/5 active:scale-90"
                    title="Añadir Ingreso"
                >
                    <ArrowUpCircle className="w-6 h-6 stroke-[2px]" />
                </button>
            </aside>
        </>
    );
};

export default MobileNav;
