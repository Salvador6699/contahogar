import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";




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
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveDialogContext.Provider>
  );
}

function useVisualViewport() {
  const [height, setHeight] = React.useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setHeight(window.visualViewport?.height || window.innerHeight);
    };
    handleResize();
    window.visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return height;
}

export function ResponsiveDialogContent({
  children,
  className,
}: ResponsiveDialogContentProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);
  const viewportHeight = useVisualViewport();

  if (isMobile) {
    return (
      <DialogContent 
        className={cn(
          "w-full max-w-none border-0 rounded-none p-0 modal-gradient-bg !translate-y-0 !top-0 !translate-x-0 !left-0 flex flex-col", 
          className
        )}
        style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      >
        <div className="flex flex-col flex-1 min-h-0 pb-safe pt-8">
          {children}
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className={cn("sm:max-w-[425px] modal-gradient-bg max-h-[85vh] flex flex-col", className)}>
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
    return <DialogHeader className={cn("text-left px-4", className)}>{children}</DialogHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
}

export function ResponsiveDialogTitle({
  children,
  className,
}: ResponsiveDialogTitleProps) {
  return <DialogTitle className={className}>{children}</DialogTitle>;
}

export function ResponsiveDialogDescription({
  children,
  className,
}: ResponsiveDialogDescriptionProps) {
  return <DialogDescription className={className}>{children}</DialogDescription>;
}
