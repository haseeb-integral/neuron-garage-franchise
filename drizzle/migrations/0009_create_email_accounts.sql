CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smartlead_id integer NOT NULL UNIQUE,
  email text NOT NULL,
  provider text,
  warmup_enabled boolean NOT NULL DEFAULT true,
  warmup_reputation integer CHECK (warmup_reputation IS NULL OR warmup_reputation BETWEEN 0 AND 100),
  daily_limit integer,
  daily_sent integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_accounts TO authenticated;
GRANT ALL ON public.email_accounts TO service_role;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view email accounts" ON public.email_accounts
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));