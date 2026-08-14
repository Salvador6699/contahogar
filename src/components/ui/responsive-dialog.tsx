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

export function ResponsiveDialogContent({
  children,
  className,
}: ResponsiveDialogContentProps) {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return (
      <DialogContent 
        className={cn(
          "w-full h-[100dvh] max-h-[100dvh] max-w-none border-0 rounded-none p-0 modal-gradient-bg !translate-y-0 !top-0 !translate-x-0 !left-0 flex flex-col", 
          className
        )}
      >
        <div className="sticky top-0 z-10 flex justify-end p-2 bg-transparent">
          <DialogClose className="rounded-full p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </div>
        <div className="flex flex-col flex-1 min-h-0 pb-safe">
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
