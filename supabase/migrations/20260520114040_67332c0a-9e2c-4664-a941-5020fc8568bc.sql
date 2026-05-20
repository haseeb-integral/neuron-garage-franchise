
-- Add 7-bucket classifier metadata
ALTER TABLE public.smartlead_events
  ADD COLUMN IF NOT EXISTS reply_intent_reason text,
  ADD COLUMN IF NOT EXISTS reply_intent_confidence numeric,
  ADD COLUMN IF NOT EXISTS reply_intent_overridden_by text,
  ADD COLUMN IF NOT EXISTS reply_intent_overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_contact text;

-- Snooze support on outreach queue
ALTER TABLE public.outreach_queue
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

-- Backfill: legacy buckets -> 7-bucket taxonomy
UPDATE public.smartlead_events
SET reply_intent = 'INFO_REQUEST',
    reply_intent_confidence = COALESCE(reply_intent_confidence, 0.3),
    reply_intent_reason = COALESCE(reply_intent_reason, 'backfill: legacy NEUTRAL → INFO_REQUEST')
WHERE reply_intent = 'NEUTRAL';

UPDATE public.smartlead_events
SET reply_intent_confidence = COALESCE(reply_intent_confidence,
      CASE reply_intent
        WHEN 'HOT' THEN 0.8
        WHEN 'NOT_INTERESTED' THEN 0.85
        WHEN 'OOO' THEN 0.9
        ELSE 0.5
      END)
WHERE reply_intent IS NOT NULL AND reply_intent_confidence IS NULL;

-- Rename legacy HOT to INTERESTED (closest equivalent in new taxonomy)
UPDATE public.smartlead_events
SET reply_intent = 'INTERESTED',
    reply_intent_reason = COALESCE(reply_intent_reason, 'backfill: legacy HOT → INTERESTED')
WHERE reply_intent = 'HOT';

-- Index for inbox queries
CREATE INDEX IF NOT EXISTS idx_smartlead_events_intent ON public.smartlead_events (reply_intent, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_snoozed ON public.outreach_queue (snoozed_until) WHERE snoozed_until IS NOT NULL;
