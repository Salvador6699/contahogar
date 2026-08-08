import { Outlet, Navigate, useLocation } from 'react-router-dom';
import MobileNav from './MobileNav';
import { useTeam } from '@/contexts/TeamContext';

const AppLayout = () => {
  const { activeTeam, teams, loading: teamLoading } = useTeam();
  const location = useLocation();

  if (teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Force users without a team to go to Teams to create or join one
  console.log('AppLayout Debug:', { activeTeam, teamsLength: teams.length, pathname: location.pathname });
  if (!activeTeam && location.pathname !== '/equipos' && location.pathname !== '/select-team') {
    if (teams.length > 1) {
      console.log('AppLayout: Redirecting to /select-team');
      return <Navigate to="/select-team" replace />;
    }
    console.log('AppLayout: Redirecting to /equipos');
    return <Navigate to="/equipos" replace />;
  }

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

