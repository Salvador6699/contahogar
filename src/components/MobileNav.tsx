import { useNavigate, useLocation } from 'react-router-dom';
import { Home, History, Scale, BarChart3, PiggyBank, Settings, ArrowLeftRight, Book } from 'lucide-react';
import { cn, withKeyboardClose } from '@/lib/utils';

const MobileNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: History, label: 'Historial', path: '/historial' },
        { icon: BarChart3, label: 'Medias', path: '/medias' },
        { icon: Scale, label: 'Cuadrar', path: '/comparativa' },
        { icon: ArrowLeftRight, label: 'Transf.', path: '/transferir' },
        { icon: PiggyBank, label: 'Presupto.', path: '/presupuestos' },
        { icon: Settings, label: 'Ajustes', path: '/ajustes' },
        { icon: Book, label: 'Guía', path: '/guia' },
    ];

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Versión Móvil: Barra Inferior */}
            <div className="lg:hidden fixed bottom-0 left-0 z-50 w-full h-20 pb-safe bg-background/80 backdrop-blur-lg border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
                <div className="grid h-full grid-cols-8 mx-auto px-2">
                    {navItems.map((item) => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <button
                                key={item.path}
                                onClick={() => withKeyboardClose(() => navigate(item.path))}
                                onPointerDown={() => withKeyboardClose(() => navigate(item.path))}
                                type="button"
                                className="inline-flex flex-col items-center justify-center group"
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all duration-300",
                                    active ? "bg-primary/10 text-primary scale-110" : "text-muted-foreground group-hover:text-primary"
                                )}>
                                    <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold mt-0.5 uppercase tracking-tight transition-all duration-300 truncate w-full text-center px-0.5 leading-none",
                                    active ? "text-primary opacity-100" : "text-muted-foreground opacity-60 group-hover:opacity-100"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Versión Escritorio: Sidebar Lateral */}
            <div className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-20 flex-col bg-background/40 backdrop-blur-xl border-r border-border py-8 items-center gap-4 shadow-[4px_0_16px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col gap-2 w-full px-2">
                    {navItems.map((item) => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <button
                                key={item.path}
                                onClick={() => withKeyboardClose(() => navigate(item.path))}
                                onPointerDown={() => withKeyboardClose(() => navigate(item.path))}
                                type="button"
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-full aspect-square rounded-2xl transition-all duration-300 group",
                                    active ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                )}
                                title={item.label}
                            >
                                <item.icon className={cn("w-6 h-6", active && "stroke-[2.5px]")} />
                                <span className={cn(
                                    "text-[9px] font-bold mt-1.5 uppercase tracking-widest",
                                    active ? "text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {item.label}
                                </span>
                                {active && (
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-lg shadow-primary/50" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default MobileNav;
