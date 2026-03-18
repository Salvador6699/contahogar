import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * MobileKeyboardScrollArea
 * Contenedor que, al enfocar cualquier input/textarea hijo,
 * hace scroll para que el campo quede visible por encima del
 * teclado virtual con suficiente espacio para mostrar sugerencias.
 */
function MobileKeyboardScrollArea({ children }: { children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      // Margen generoso para dejar ver las sugerencias (chips) debajo del input
      const SUGGESTIONS_SPACE = 220;

      setTimeout(() => {
        const inputRect = target.getBoundingClientRect();
        // Altura real visible (descontando teclado virtual si el navegador lo soporta)
        const visibleHeight = window.visualViewport?.height ?? window.innerHeight;

        const inputBottomWithSpace = inputRect.bottom + SUGGESTIONS_SPACE;

        if (inputBottomWithSpace > visibleHeight) {
          const overflow = inputBottomWithSpace - visibleHeight;
          // Scroll dentro del contenedor del drawer
          container.scrollBy({ top: overflow, behavior: 'smooth' });
          // También scroll de la ventana (para iOS Safari que a veces ignora el scroll del contenedor)
          window.scrollBy({ top: overflow, behavior: 'smooth' });
        }
      }, 350); // espera a que el teclado termine de abrirse (~300ms en iOS)
    };

    container.addEventListener('focusin', handleFocusIn);
    return () => container.removeEventListener('focusin', handleFocusIn);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-2 pb-safe"
      style={{ overscrollBehavior: 'contain' }}
    >
      {children}
      {/* Espacio extra al final para que se pueda hacer scroll suficiente */}
      <div style={{ height: '2rem' }} aria-hidden="true" />
    </div>
  );
}


interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange} dismissible={!!onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogContent({
  children,
  className,
}: ResponsiveDialogContentProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return (
      <DrawerContent className={cn("px-4 pb-6 modal-gradient-bg", className)}>
        <div className="sticky top-0 z-10 flex justify-end p-2 bg-transparent">
          <DrawerClose className="rounded-full p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Cerrar</span>
          </DrawerClose>
        </div>
        <MobileKeyboardScrollArea>
          {children}
        </MobileKeyboardScrollArea>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={cn("sm:max-w-[425px] modal-gradient-bg", className)}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({
  children,
  className,
}: ResponsiveDialogHeaderProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerHeader className={cn("text-left", className)}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
}

export function ResponsiveDialogTitle({
  children,
  className,
}: ResponsiveDialogTitleProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
}

export function ResponsiveDialogDescription({
  children,
  className,
}: ResponsiveDialogDescriptionProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>;
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
}
