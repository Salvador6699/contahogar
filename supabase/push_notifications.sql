-- Web Push Notifications for ContaHogar (and compatible with multi-app setup)
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  device_id text NOT NULL,
  app text NOT NULL DEFAULT 'contahogar',
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_app_device
  ON public.push_subscriptions (app, device_id);

CREATE TABLE IF NOT EXISTS public.push_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key text NOT NULL UNIQUE,
  app text NOT NULL DEFAULT 'contahogar',
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text NULL,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_logs_app_created
  ON public.push_logs (app, created_at DESC);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso publico push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Acceso publico push_subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso publico push_logs" ON public.push_logs;
CREATE POLICY "Acceso publico push_logs"
  ON public.push_logs
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
