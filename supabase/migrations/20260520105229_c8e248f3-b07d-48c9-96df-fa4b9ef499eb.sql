ALTER TABLE public.outreach_queue
  ADD COLUMN IF NOT EXISTS smartlead_lead_id text,
  ADD COLUMN IF NOT EXISTS pushed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_error text;