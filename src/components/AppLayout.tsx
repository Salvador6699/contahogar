import { Outlet } from 'react-router-dom';
import MobileNav from './MobileNav';

const AppLayout = () => {
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
