-- ==============================================================================
-- CONTAHOGAR: ELIMINAR USUARIOS Y EQUIPOS (SIN PERDER DATOS CONTABLES)
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
--
-- Qué hace:
--   1. Elimina todas las políticas RLS basadas en equipos/usuarios.
--   2. Quita las columnas team_id (y user_id en transactions) de las tablas de datos.
--      -> Solo se borra la COLUMNA, las filas (cuentas, movimientos, etc.) se mantienen.
--   3. Borra las tablas teams, team_members, user_profiles y modification_requests,
--      el trigger de alta de usuario y las funciones auxiliares.
--   4. Deja acceso abierto (rol anon) a las tablas de datos, ya que la app ya no tiene login.
--
-- IMPORTANTE: el orden importa. Las columnas team_id tienen FK "ON DELETE CASCADE"
-- hacia teams, por eso se eliminan las columnas ANTES de tocar la tabla teams
-- (nunca se hace DELETE FROM teams, que sí borraría los datos en cascada).
-- ==============================================================================

BEGIN;

-- 1. Eliminar TODAS las políticas existentes en las tablas de datos
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
            'accounts', 'transactions', 'categories', 'budgets', 'favorites',
            'savings_goals', 'recurring_rules', 'loans', 'cloud_snapshots',
            'user_profiles', 'teams', 'team_members', 'modification_requests'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. Quitar columnas team_id (la FK e índice se eliminan con la columna)
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['accounts', 'transactions', 'categories', 'budgets', 'favorites', 'savings_goals', 'recurring_rules', 'loans'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS team_id', t);
    END LOOP;
END $$;

-- Columna de autor en movimientos
ALTER TABLE public.transactions DROP COLUMN IF EXISTS user_id;

-- 3. Eliminar trigger de alta de usuarios y funciones auxiliares
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_team_member(UUID);
DROP FUNCTION IF EXISTS public.is_team_admin(UUID);

-- Eliminar tablas de usuarios/equipos (ya no hay nada que dependa de ellas)
DROP TABLE IF EXISTS public.modification_requests;
DROP TABLE IF EXISTS public.team_members;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.user_profiles;

-- 4. Acceso abierto a las tablas de datos (la app ya no usa login)
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['accounts', 'transactions', 'categories', 'budgets', 'favorites', 'savings_goals', 'recurring_rules', 'loans', 'cloud_snapshots'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('CREATE POLICY "Acceso publico" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
        END IF;
    END LOOP;
END $$;

-- 5. Añadir columna opcional para planificar provisiones en gastos fijos
ALTER TABLE public.recurring_rules ADD COLUMN IF NOT EXISTS "includeInSavings" BOOLEAN;

COMMIT;

-- Opcional: borrar las cuentas de usuario de Supabase Auth (Authentication > Users).
-- No afecta a los datos contables. Descomenta si quieres hacerlo desde aquí:
-- DELETE FROM auth.users;
