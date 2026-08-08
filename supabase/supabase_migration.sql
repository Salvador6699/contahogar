-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Crear tabla de Perfiles de Usuario (conectada a auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla de Equipos
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear tabla de Miembros de Equipos (Roles)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

-- 4. Crear tabla de Peticiones de Modificación
CREATE TABLE IF NOT EXISTS public.modification_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- 'delete_transaction', 'edit_transaction', etc.
    target_id UUID NOT NULL, -- ID of the transaction/account to modify
    details JSONB, -- Changes requested
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear el Equipo Heredado (para no perder datos actuales)
INSERT INTO public.teams (id, name, invite_code) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Equipo Heredado', 'HEREDADO')
ON CONFLICT (id) DO NOTHING;

-- 6. Añadir team_id a todas las tablas de datos
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['accounts', 'transactions', 'categories', 'budgets', 'favorites', 'savings_goals', 'recurring_rules', 'loans'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE DEFAULT ''00000000-0000-0000-0000-000000000000''', t);
        -- Opcional: Para rendimiento
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_team_id ON public.%I(team_id)', t, t);
    END LOOP;
END $$;

-- 7. Configurar Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Habilitar RLS en todas las tablas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Nota: Para mantener la app funcionando mientra implementamos Auth en frontend:
CREATE OR REPLACE FUNCTION pg_temp.create_temp_policy(table_name TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Temp Allow All" ON public.%I', table_name);
    EXECUTE format('CREATE POLICY "Temp Allow All" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_name);
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.create_temp_policy('user_profiles');
SELECT pg_temp.create_temp_policy('teams');
SELECT pg_temp.create_temp_policy('team_members');
SELECT pg_temp.create_temp_policy('modification_requests');
SELECT pg_temp.create_temp_policy('accounts');
SELECT pg_temp.create_temp_policy('transactions');
SELECT pg_temp.create_temp_policy('categories');
SELECT pg_temp.create_temp_policy('budgets');
SELECT pg_temp.create_temp_policy('favorites');
SELECT pg_temp.create_temp_policy('savings_goals');
SELECT pg_temp.create_temp_policy('recurring_rules');
SELECT pg_temp.create_temp_policy('loans');
