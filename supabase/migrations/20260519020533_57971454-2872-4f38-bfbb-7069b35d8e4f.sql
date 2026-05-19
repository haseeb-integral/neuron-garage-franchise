
-- smartlead_events: webhook event log
CREATE TABLE public.smartlead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  campaign_id text,
  lead_id text,
  lead_email text,
  reply_message_id text,
  reply_message text,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_smartlead_events_received_at ON public.smartlead_events (received_at DESC);
CREATE INDEX idx_smartlead_events_event_type ON public.smartlead_events (event_type);
CREATE INDEX idx_smartlead_events_campaign ON public.smartlead_events (campaign_id);

ALTER TABLE public.smartlead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view smartlead events" ON public.smartlead_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert smartlead events" ON public.smartlead_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update smartlead events" ON public.smartlead_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete smartlead events" ON public.smartlead_events FOR DELETE TO authenticated USING (true);

-- prospect_batches: uploaded list batches
CREATE TABLE public.prospect_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL,
  source text,
  city text,
  state text,
  segment text,
  record_count integer NOT NULL DEFAULT 0,
  approved_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  campaign_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prospect_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view prospect batches" ON public.prospect_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert prospect batches" ON public.prospect_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update prospect batches" ON public.prospect_batches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete prospect batches" ON public.prospect_batches FOR DELETE TO authenticated USING (true);

-- prospects_staging: per-row leads pending QA
CREATE TABLE public.prospects_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.prospect_batches(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  company text,
  city text,
  state text,
  segment text,
  source text,
  qa_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prospects_staging_batch ON public.prospects_staging (batch_id);

ALTER TABLE public.prospects_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view prospects staging" ON public.prospects_staging FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert prospects staging" ON public.prospects_staging FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update prospects staging" ON public.prospects_staging FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete prospects staging" ON public.prospects_staging FOR DELETE TO authenticated USING (true);

-- campaign_cache: cached SmartLead campaigns
CREATE TABLE public.campaign_cache (
  id text PRIMARY KEY,
  name text,
  status text,
  raw_data jsonb,
  last_synced timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view campaign cache" ON public.campaign_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert campaign cache" ON public.campaign_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update campaign cache" ON public.campaign_cache FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete campaign cache" ON public.campaign_cache FOR DELETE TO authenticated USING (true);
