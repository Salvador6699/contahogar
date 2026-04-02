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
  ArrowUpCircle
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

    const bottomNavItems = [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: Scale, label: 'Cuadrar', path: '/comparativa' },
        { icon: ArrowLeftRight, label: 'Transf.', path: '/transferir' },
    ];

    const drawerNavItems = [
        { icon: History, label: 'Historial', path: '/historial' },
        { icon: BarChart3, label: 'Medias', path: '/medias' },
        { icon: Wrench, label: 'Gestión', path: '/gestion' },
        { icon: PiggyBank, label: 'Presupuestos', path: '/presupuestos' },
        { icon: Settings, label: 'Ajustes', path: '/ajustes' },
        { icon: Book, label: 'Guía', path: '/guia' },
    ];

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Cabecera Fija Superior */}
            <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm flex items-center justify-between px-4 lg:pl-24">
                <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <img 
                            src="/archivos/logo-premium.png" 
                            alt="ContaHogar Logo" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <span className="text-xl font-black tracking-tight text-foreground bg-clip-text">
                        ContaHogar
                    </span>
                </div>

                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[80%] sm:w-[350px] border-l border-border/50 bg-background/95 backdrop-blur-xl p-0">
                        <SheetHeader className="p-6 border-b border-border/50">
                            <SheetTitle className="text-2xl font-black flex items-center gap-2">
                                <Menu className="w-6 h-6 text-primary" />
                                Menú Principal
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col py-4 px-2 gap-1">
                            {drawerNavItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <SheetClose asChild key={item.path}>
                                        <button
                                            onClick={() => navigate(item.path)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold",
                                                active 
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                            )}
                                        >
                                            <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
                                            <span className="text-sm uppercase tracking-widest">{item.label}</span>
                                            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                                        </button>
                                    </SheetClose>
                                );
                            })}
                        </div>
                        <div className="mt-auto p-6 border-t border-border/50">
                            <p className="text-[10px] text-center font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                ContaHogar v2.0 • Premium Edition
                            </p>
                        </div>
                    </SheetContent>
                </Sheet>
            </header>

            {/* BARRA INFERIOR MODERNA */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-2 pb-safe lg:hidden">
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
                                    "p-2 rounded-2xl transition-all duration-500",
                                    active 
                                        ? "bg-primary/10 text-primary -translate-y-1" 
                                        : "text-muted-foreground group-hover:text-primary"
                                )}>
                                    <item.icon className={cn("w-6 h-6", active && "stroke-[2.5px]")} />
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                                    active ? "text-primary opacity-100" : "text-muted-foreground/60"
                                )}>
                                    {item.label}
                                </span>
                                {active && (
                                    <div className="absolute top-0 w-8 h-1 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
                                )}
                            </button>
                        );
                    })}

                    {/* BOTÓN GASTO DIRECTO */}
                    <button
                        onClick={() => navigate('/?action=add-expense')}
                        className="flex flex-col items-center justify-center group"
                    >
                        <div className="p-2 rounded-2xl text-expense bg-expense/5 group-hover:bg-expense/20 transition-all duration-300">
                            <ArrowDownCircle className="w-6 h-6 stroke-[2.5px]" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-expense">Gasto</span>
                    </button>

                    {/* BOTÓN INGRESO DIRECTO */}
                    <button
                        onClick={() => navigate('/?action=add-income')}
                        className="flex flex-col items-center justify-center group"
                    >
                        <div className="p-2 rounded-2xl text-income bg-income/5 group-hover:bg-income/20 transition-all duration-300">
                            <ArrowUpCircle className="w-6 h-6 stroke-[2.5px]" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-income">Ingreso</span>
                    </button>
                </div>
            </nav>

            {/* SIDEBAR ESCRITORIO CON ACCESO DIRECTO */}
            <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-20 flex-col bg-background/60 backdrop-blur-2xl border-r border-border/50 py-8 items-center gap-6 shadow-[4px_0_24px_rgba(0,0,0,0.03)] pt-24">
                {bottomNavItems.map((item) => {
                    const active = isActive(item.path, item.exact);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 group relative",
                                active ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            )}
                            title={item.label}
                        >
                            <item.icon className={cn("w-6 h-6", active && "stroke-[2.5px]")} />
                            {active && (
                                <div className="absolute -left-1 w-1 h-8 bg-primary rounded-r-full" />
                            )}
                        </button>
                    );
                })}
                
                <button
                    onClick={() => navigate('/?action=add-expense')}
                    className="flex items-center justify-center w-14 h-14 rounded-2xl bg-expense/10 text-expense hover:bg-expense hover:text-white transition-all duration-300 shadow-lg shadow-expense/5"
                    title="Añadir Gasto"
                >
                    <ArrowDownCircle className="w-7 h-7" />
                </button>
                <button
                    onClick={() => navigate('/?action=add-income')}
                    className="flex items-center justify-center w-14 h-14 rounded-2xl bg-income/10 text-income hover:bg-income hover:text-white transition-all duration-300 shadow-lg shadow-income/5"
                    title="Añadir Ingreso"
                >
                    <ArrowUpCircle className="w-7 h-7" />
                </button>
            </aside>
        </>
    );
};

export default MobileNav;
