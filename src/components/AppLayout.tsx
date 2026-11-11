import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import MobileNav from './MobileNav';
import { useTheme } from 'next-themes';
import { useEffect, useMemo } from 'react';
import { syncRecurringTransactionsToSupabase } from '@/lib/recurrence';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { getNavPillars, findActivePillar } from '@/lib/navigationV2';
import { cn } from '@/lib/utils';

const AppLayout = () => {
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();

  const pillars = useMemo(
    () => getNavPillars(flags.exp_cashflow_lab),
    [flags.exp_cashflow_lab]
  );
  const activePillar = useMemo(
    () => findActivePillar(location.pathname, pillars),
    [location.pathname, pillars]
  );

  // Generate pending recurring transactions once when the app starts
  useEffect(() => {
    syncRecurringTransactionsToSupabase().catch(console.error);
  }, []);

  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute(
      'content', 
      resolvedTheme === 'dark' ? '#09090b' : '#ffffff'
    );
  }, [resolvedTheme]);

  const showSubNav =
    flags.exp_nav_v2 &&
    activePillar &&
    activePillar.id !== 'inicio' &&
    activePillar.items.length > 1;

  return (
    <div className="min-h-screen app-gradient-bg flex flex-col">
      <main className="flex-1 w-full pt-14 pb-24 lg:pt-20 lg:pb-8 relative">
        {showSubNav && (
          <div className="sticky top-14 lg:top-20 z-30 border-b border-border/15 bg-background/80 backdrop-blur-md">
            <div className="container max-w-5xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 pr-1.5 shrink-0">
                {activePillar.label}
              </span>
              {activePillar.items.map((item) => {
                const isItemActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate({ to: item.path } as any)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                      isItemActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;

