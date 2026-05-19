-- Phase 5: reply intent column + realtime publication
ALTER TABLE public.smartlead_events
  ADD COLUMN IF NOT EXISTS reply_intent text;

CREATE INDEX IF NOT EXISTS idx_smartlead_events_intent ON public.smartlead_events (reply_intent);
CREATE INDEX IF NOT EXISTS idx_smartlead_events_received_at ON public.smartlead_events (received_at DESC);

-- Enable realtime
ALTER TABLE public.smartlead_events REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'smartlead_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.smartlead_events';
  END IF;
END $$;