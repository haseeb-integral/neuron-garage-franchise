CREATE TABLE public.campaign_mailbox_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_cache_id text NOT NULL,
  smartlead_campaign_id bigint NOT NULL,
  email_account_smartlead_id integer NOT NULL,
  email text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (smartlead_campaign_id, email_account_smartlead_id)
);
CREATE INDEX campaign_mailbox_assignments_account_idx ON public.campaign_mailbox_assignments (email_account_smartlead_id);
GRANT SELECT ON public.campaign_mailbox_assignments TO authenticated;
GRANT ALL ON public.campaign_mailbox_assignments TO service_role;
ALTER TABLE public.campaign_mailbox_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view campaign mailbox assignments" ON public.campaign_mailbox_assignments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));