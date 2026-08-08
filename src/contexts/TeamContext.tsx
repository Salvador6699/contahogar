import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type Team = {
  id: string;
  name: string;
  invite_code: string;
};

export type TeamMember = {
  team_id: string;
  role: 'admin' | 'user';
  teams: Team; // Joined data
};

type TeamContextType = {
  teams: TeamMember[];
  activeTeam: Team | null;
  activeRole: 'admin' | 'user' | null;
  loading: boolean;
  setActiveTeamId: (id: string) => void;
  refreshTeams: () => Promise<void>;
};

const TeamContext = createContext<TeamContextType>({
  teams: [],
  activeTeam: null,
  activeRole: null,
  loading: true,
  setActiveTeamId: () => {},
  refreshTeams: async () => {},
});

export const TeamProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [activeTeamId, setLocalActiveTeamId] = useState<string | null>(
    localStorage.getItem('contahogar_active_team_id')
  );
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (authLoading) return; // Esperar a que AuthContext termine
    
    if (!user) {
      setTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        teams (
          id,
          name,
          invite_code
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } else {
      // Supabase typing might be slightly off with joins, cast it safely
      const fetchedTeams = (data as any[]) || [];
      setTeams(fetchedTeams);
      
      // Auto-select team only if there's exactly 1, or if they have a valid cached one
      if (fetchedTeams.length > 0) {
        const isValid = fetchedTeams.some(t => t.team_id === activeTeamId);
        
        if (isValid) {
          // Keep current
        } else if (fetchedTeams.length === 1) {
          // Auto select if only 1 team
          setActiveTeamId(fetchedTeams[0].team_id);
        } else {
          // If > 1 team and no valid activeTeamId, clear it so they are forced to select
          setLocalActiveTeamId(null);
          localStorage.removeItem('contahogar_active_team_id');
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, [user, authLoading]);

  const setActiveTeamId = (id: string) => {
    setLocalActiveTeamId(id);
    localStorage.setItem('contahogar_active_team_id', id);
  };

  const computedActiveTeamId = activeTeamId || (teams.length === 1 ? teams[0].team_id : null);
  const activeTeamMember = teams.find(t => t.team_id === computedActiveTeamId);
  const activeTeam = activeTeamMember?.teams || null;
  const activeRole = activeTeamMember?.role || null;

  return (
    <TeamContext.Provider value={{ 
      teams, 
      activeTeam, 
      activeRole, 
      loading, 
      setActiveTeamId, 
      refreshTeams: fetchTeams 
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);
