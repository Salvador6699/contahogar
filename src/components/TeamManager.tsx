import React, { useState, useEffect } from "react";
import { useTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Users, UserPlus, Key, LogOut, CheckCircle2, Copy, Trash2, Edit2, Save, X, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export const TeamManager = () => {
  const { teams, activeTeam, activeRole, refreshTeams, setActiveTeamId } = useTeam();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  useEffect(() => {
    if (activeTeam && activeRole === 'admin') {
      fetchMembers();
      setEditedName(activeTeam.name);
    }
  }, [activeTeam, activeRole]);

  const fetchMembers = async () => {
    if (!activeTeam) return;
    const { data, error } = await supabase
      .from('team_members')
      .select('user_id, role, user_profiles(email, full_name)')
      .eq('team_id', activeTeam.id);
    
    if (data && !error) {
      setTeamMembers(data);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    setLoading(true);

    try {
      const code = `TM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{ name: newTeamName, invite_code: code }])
        .select()
        .single();
      
      if (teamError) throw teamError;

      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{ team_id: teamData.id, user_id: user.id, role: 'admin' }]);
        
      if (memberError) throw memberError;

      toast.success("Equipo creado con éxito");
      setNewTeamName("");
      await refreshTeams();
      setActiveTeamId(teamData.id);
    } catch (err: any) {
      toast.error(err.message || "Error al crear el equipo");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;
    setLoading(true);

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (teamError || !teamData) {
        throw new Error("Código de invitación no válido");
      }

      if (teams.some(t => t.team_id === teamData.id)) {
        throw new Error("Ya perteneces a este equipo");
      }

      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{ team_id: teamData.id, user_id: user.id, role: 'user' }]);

      if (memberError) throw memberError;

      toast.success(`Te has unido a ${teamData.name}`);
      setInviteCode("");
      await refreshTeams();
      setActiveTeamId(teamData.id);
    } catch (err: any) {
      toast.error(err.message || "Error al unirse al equipo");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!activeTeam || activeRole !== 'admin') return;
    
    if (newRole === 'user') {
      const adminCount = teamMembers.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) {
        toast.error("Debe haber al menos un administrador en el equipo");
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', activeTeam.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success("Rol actualizado");
      fetchMembers();
      if (userId === user?.id) {
        refreshTeams();
      }
    } catch (err: any) {
      toast.error("Error al actualizar rol");
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || !activeTeam) return;
    setLoading(true);
    const { error } = await supabase.from('teams').update({ name: editedName }).eq('id', activeTeam.id);
    setLoading(false);
    
    if (!error) {
      toast.success("Nombre del equipo actualizado");
      setIsEditingName(false);
      refreshTeams();
    } else {
      toast.error("Error al actualizar el nombre");
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!activeTeam || activeRole !== 'admin') return;
    
    if (userId === user?.id) {
      toast.error("Para salirte del equipo usa el botón 'Abandonar Equipo'");
      return;
    }

    if (window.confirm("¿Seguro que quieres expulsar a este miembro del equipo?")) {
      try {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', activeTeam.id)
          .eq('user_id', userId);

        if (error) throw error;
        toast.success("Miembro expulsado");
        fetchMembers();
      } catch (err: any) {
        toast.error("Error al expulsar al miembro");
      }
    }
  };

  const copyInviteCode = () => {
    if (activeTeam) {
      navigator.clipboard.writeText(activeTeam.invite_code);
      toast.success("Código copiado al portapapeles");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Equipo Activo */}
      <Card className="border-none shadow-sm bg-primary/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-primary shrink-0" />
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input 
                  value={editedName} 
                  onChange={(e) => setEditedName(e.target.value)} 
                  className="h-8 max-w-[200px]"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={handleSaveName} disabled={loading}>
                  <Save size={16} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => { setIsEditingName(false); setEditedName(activeTeam?.name || ''); }}>
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                Equipo Activo: {activeTeam?.name || "Cargando..."}
                {activeRole === 'admin' && activeTeam && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 ml-1" onClick={() => setIsEditingName(true)}>
                    <Edit2 size={14} />
                  </Button>
                )}
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Tu rol actual es: <strong className="uppercase">{activeRole}</strong>
          </CardDescription>
        </CardHeader>
        {activeTeam && (
          <CardContent>
            {activeRole === 'admin' && (
              <>
                <div className="bg-background rounded-xl p-4 flex items-center justify-between border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Código de Invitación</p>
                    <p className="font-mono text-lg font-black tracking-widest">{activeTeam.invite_code}</p>
                  </div>
                  <Button onClick={copyInviteCode} variant="outline" className="gap-2">
                    <Copy size={16} /> Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 mb-4">
                  Comparte este código con tu familia para que se unan a esta contabilidad.
                </p>
              </>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
              {teams.length > 1 && (
                <Button 
                  variant="secondary" 
                  className="w-full gap-2"
                  onClick={() => navigate('/select-team')}
                >
                  <ArrowRightLeft size={16} /> Cambiar Equipo
                </Button>
              )}
              
              {activeRole === 'admin' ? (
                <>
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2"
                    onClick={async () => {
                      if (window.confirm("¿Seguro que quieres eliminar este equipo entero? Esta acción NO se puede deshacer y borrará todas las cuentas y transacciones.")) {
                        setLoading(true);
                        const { error } = await supabase.from('teams').delete().eq('id', activeTeam.id);
                        setLoading(false);
                        if (!error) {
                          toast.success("Equipo eliminado");
                          setActiveTeamId('');
                          window.location.href = '/';
                        } else {
                          toast.error("Error al eliminar equipo");
                        }
                      }
                    }}
                  >
                    <Trash2 size={16} /> Eliminar Equipo
                  </Button>
                </>
              ) : null}
              
              <Button 
                variant="outline" 
                className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={async () => {
                  if (window.confirm("¿Seguro que quieres abandonar este equipo? No podrás volver a entrar sin el código.")) {
                    setLoading(true);
                    const { error } = await supabase.from('team_members').delete().eq('team_id', activeTeam.id).eq('user_id', user?.id);
                    setLoading(false);
                    if (!error) {
                      toast.success("Has abandonado el equipo");
                      setActiveTeamId('');
                      window.location.href = '/';
                    } else {
                      toast.error("Error al abandonar equipo");
                    }
                  }
                }}
              >
                <LogOut size={16} /> Abandonar Equipo
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Administrar Miembros */}
      {activeRole === 'admin' && teamMembers.length > 0 && (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Miembros de {activeTeam?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamMembers.map((member, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <p className="font-medium text-sm">
                    {member.user_profiles?.full_name || member.user_profiles?.email}
                    {member.user_id === user?.id && " (Tú)"}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user_profiles?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="bg-muted text-xs p-1.5 rounded outline-none cursor-pointer"
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                    disabled={member.user_id === user?.id && teamMembers.filter(m => m.role === 'admin').length === 1}
                  >
                    <option value="admin">Administrador</option>
                    <option value="user">Usuario</option>
                  </select>
                  {member.user_id !== user?.id && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleKickMember(member.user_id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Crear un Equipo */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Crear un Nuevo Equipo</CardTitle>
          <CardDescription>
            Crea una contabilidad separada (ej: Hijos, Negocio). Serás el administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTeam} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="newTeamName">Nombre del Equipo</Label>
              <Input
                id="newTeamName"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ej: Contabilidad Negocio"
              />
            </div>
            <Button type="submit" disabled={loading} className="gap-2" variant="secondary">
              <UserPlus size={16} /> Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Unirse a un Equipo */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Unirse a un Equipo</CardTitle>
          <CardDescription>
            Introduce el código que te ha pasado el administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinTeam} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="inviteCode">Código de Invitación</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ej: TM-X7B9K2"
              />
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              <Key size={16} /> Unirme
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
};
