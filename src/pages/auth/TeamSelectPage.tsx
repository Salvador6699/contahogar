import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, LogOut, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TeamSelectPage = () => {
  const { teams, setActiveTeamId } = useTeam();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (teamId: string) => {
    setActiveTeamId(teamId);
    window.location.href = '/'; // Force reload to apply active team globally
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 text-primary shadow-xl shadow-primary/20">
            <Users size={40} />
          </div>
          <h1 className="text-3xl font-black font-outfit mb-2">
            Elige tu contabilidad
          </h1>
          <p className="text-muted-foreground">
            Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}.<br/>
            Selecciona a qué equipo deseas entrar.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {teams.map((t) => (
            <button
              key={t.team_id}
              onClick={() => handleSelect(t.team_id)}
              className="w-full bg-card/50 backdrop-blur-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-4 flex items-center justify-between transition-all group shadow-sm hover:shadow-md"
            >
              <div className="text-left">
                <h3 className="font-bold text-lg">{t.teams.name}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">
                  Rol: {t.role}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shadow-sm border border-border/50">
                <ChevronRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/ajustes?tab=equipos')} 
            variant="outline" 
            className="w-full h-14 rounded-2xl border-dashed border-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <UserPlus size={18} /> Crear o Unirme a otro equipo
          </Button>

          <Button 
            onClick={signOut} 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-14 rounded-2xl gap-2"
          >
            <LogOut size={18} /> Cerrar Sesión
          </Button>
        </div>

      </div>
    </div>
  );
};

export default TeamSelectPage;
