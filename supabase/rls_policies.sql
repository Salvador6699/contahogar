-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS) PARA CONTAHOGAR (VERSIÓN UNIFICADA FINAL)
-- Ejecutar en el SQL Editor de Supabase (Sirve tanto para primera vez como para actualizar)
-- ==============================================================================

-- 1. Eliminar todas las políticas anteriores para evitar conflictos
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['user_profiles', 'teams', 'team_members', 'modification_requests', 'accounts', 'transactions', 'categories', 'budgets', 'favorites', 'savings_goals', 'recurring_rules', 'loans'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Borrar politicas temporales
        EXECUTE format('DROP POLICY IF EXISTS "Temp Allow All" ON public.%I', t);
        -- Borrar politicas de datos si existen
        EXECUTE format('DROP POLICY IF EXISTS "Ver datos del equipo" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Insertar datos en equipo" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Actualizar datos del equipo" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Borrar datos del equipo" ON public.%I', t);
    END LOOP;
END $$;

-- Limpiar politicas especificas de tablas base
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

DROP POLICY IF EXISTS "View all teams" ON public.teams;
DROP POLICY IF EXISTS "View own teams" ON public.teams;
DROP POLICY IF EXISTS "Create teams" ON public.teams;
DROP POLICY IF EXISTS "Edit own teams" ON public.teams;

DROP POLICY IF EXISTS "View team members" ON public.team_members;
DROP POLICY IF EXISTS "Join team" ON public.team_members;
DROP POLICY IF EXISTS "Leave team" ON public.team_members;
DROP POLICY IF EXISTS "Leave or kick team members" ON public.team_members;
DROP POLICY IF EXISTS "Admin update team members" ON public.team_members;


-- 2. Funciones auxiliares de seguridad (Con SECURITY DEFINER para bypass RLS interno)
CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = $1 
    AND team_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_admin(team_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = $1 
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Políticas para Perfiles (user_profiles)
CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Políticas para Equipos (teams)
CREATE POLICY "View all teams" ON public.teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Create teams" ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Edit own teams" ON public.teams FOR UPDATE USING (public.is_team_member(id));

-- 5. Políticas para Miembros (team_members)
CREATE POLICY "View team members" ON public.team_members FOR SELECT USING (user_id = auth.uid() OR public.is_team_member(team_id));
CREATE POLICY "Join team" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave or kick team members" ON public.team_members FOR DELETE USING (auth.uid() = user_id OR public.is_team_admin(team_id));
CREATE POLICY "Admin update team members" ON public.team_members FOR UPDATE USING (public.is_team_admin(team_id));

-- 6. Políticas Generales para Datos (transactions, accounts, etc.)
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['accounts', 'transactions', 'categories', 'budgets', 'favorites', 'savings_goals', 'recurring_rules', 'loans', 'modification_requests'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('CREATE POLICY "Ver datos del equipo" ON public.%I FOR SELECT USING (public.is_team_member(team_id))', t);
        EXECUTE format('CREATE POLICY "Insertar datos en equipo" ON public.%I FOR INSERT WITH CHECK (public.is_team_member(team_id))', t);
        EXECUTE format('CREATE POLICY "Actualizar datos del equipo" ON public.%I FOR UPDATE USING (public.is_team_member(team_id))', t);
        EXECUTE format('CREATE POLICY "Borrar datos del equipo" ON public.%I FOR DELETE USING (public.is_team_member(team_id))', t);
    END LOOP;
END $$;
