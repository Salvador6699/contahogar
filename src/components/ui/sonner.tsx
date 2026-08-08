/* eslint-disable react-refresh/only-export-components */
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useState, useEffect } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Dismiss all toasts when clicking outside of them
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sonner-toast]')) {
        toast.dismiss();
      }
    };
    document.addEventListener('click', handleClick, { capture: false });
    return () => document.removeEventListener('click', handleClick, { capture: false });
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isMobile ? "top-center" : "top-right"}
      style={{
        marginTop: isMobile ? 'calc(env(safe-area-inset-top) + 16px)' : 'calc(env(safe-area-inset-top) + 16px)',
        marginBottom: isMobile ? 0 : 0
      }}
      duration={2000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg !w-auto !min-w-min max-w-[90vw] pr-6",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
