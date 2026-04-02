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
  ShieldCheck
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

const MobileNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

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

    const drawerNavItems: NavItem[] = [
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
        const allItems = [...bottomNavItems, ...drawerNavItems];
        const current = allItems.find(item => {
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

                <Sheet>
                    <SheetTrigger asChild>
                        <button className="flex flex-col items-center justify-center group active:scale-90 transition-all px-2">
                            <div className="p-2 rounded-xl text-muted-foreground/60 group-hover:text-primary transition-all duration-500">
                                <Menu className="w-5 h-5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 -mt-1 group-hover:text-primary transition-colors">
                                Menú
                            </span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85%] sm:w-[380px] border-l border-border/20 bg-background/95 backdrop-blur-3xl p-0">
                        <SheetHeader className="p-8 border-b border-border/10">
                            <SheetTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <Menu className="w-6 h-6 text-primary" />
                                </div>
                                <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">ContaHogar</span>
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col py-6 px-3 gap-2">
                            {drawerNavItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <SheetClose asChild key={item.path}>
                                        <button
                                            onClick={() => navigate(item.path)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold group",
                                                active 
                                                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/25 scale-[1.02]" 
                                                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary active:scale-95"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-xl transition-colors",
                                                active ? "bg-white/20" : "bg-primary/5 group-hover:bg-primary/10"
                                            )}>
                                                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
                                            </div>
                                            <span className="text-xs uppercase tracking-[0.2em]">{item.label}</span>
                                            {active && <div className="ml-auto w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />}
                                        </button>
                                    </SheetClose>
                                );
                            })}
                        </div>
                        <div className="mt-auto p-8 border-t border-border/10 bg-muted/30">
                            <p className="text-[10px] text-center font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic">
                                ContaHogar • Premium Experience
                            </p>
                        </div>
                    </SheetContent>
                </Sheet>
            </header>

            {/* BARRA INFERIOR MODERNA - Compacta & Glassmorphism */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 h-[68px] bg-gradient-to-t from-background/95 via-background/85 to-transparent nav-blur-fade px-4 pb-safe lg:hidden transition-all duration-300">
                <div className="grid h-full grid-cols-5 max-w-lg mx-auto">
                    {bottomNavItems.map((item) => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <button
                                key={item.path}
                                onClick={() => withKeyboardClose(() => navigate(item.path))}
                                className="flex flex-col items-center justify-center relative group"
                            >
                                <div className={cn(
                                    "p-2 rounded-xl transition-all duration-500",
                                    active 
                                        ? "text-primary scale-110" 
                                        : "text-muted-foreground/60 group-hover:text-primary"
                                )}>
                                    <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest transition-all duration-300",
                                    active ? "text-primary opacity-100 mt-0.5" : "text-muted-foreground/40 mt-0.5"
                                )}>
                                    {item.label}
                                </span>
                                {active && (
                                    <div className="absolute top-0 w-10 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                )}
                            </button>
                        );
                    })}

                    {/* BOTÓN GASTO DIRECTO */}
                    <button
                        onClick={() => navigate('/?action=add-expense')}
                        className="flex flex-col items-center justify-center group"
                    >
                        <div className="p-2.5 rounded-xl text-expense bg-expense/5 group-hover:bg-expense/20 transition-all duration-300 active:scale-90">
                            <ArrowDownCircle className="w-5 h-5 stroke-[2.5px]" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-expense mt-0.5">Gasto</span>
                    </button>

                    {/* BOTÓN INGRESO DIRECTO */}
                    <button
                        onClick={() => navigate('/?action=add-income')}
                        className="flex flex-col items-center justify-center group"
                    >
                        <div className="p-2.5 rounded-xl text-income bg-income/5 group-hover:bg-income/20 transition-all duration-300 active:scale-90">
                            <ArrowUpCircle className="w-5 h-5 stroke-[2.5px]" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-income mt-0.5">Ingreso</span>
                    </button>
                </div>
            </nav>

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
