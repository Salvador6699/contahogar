import { Outlet } from 'react-router-dom';
import MobileNav from './MobileNav';

const AppLayout = () => {
  return (
    <div className="min-h-screen app-gradient-bg">
      <Outlet />
      <MobileNav />
    </div>
  );
};

export default AppLayout;
