import { Outlet } from '@tanstack/react-router';
import MobileNav from './MobileNav';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { syncRecurringTransactionsToSupabase } from '@/lib/recurrence';

const AppLayout = () => {
  const { resolvedTheme } = useTheme();

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

  return (
    <div className="min-h-screen app-gradient-bg flex flex-col">
      <main className="flex-1 w-full pt-14 pb-24 lg:pt-20 lg:pb-8 relative">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;

