ALTER TABLE public.mvs_operator_watchlist
  ADD COLUMN IF NOT EXISTS is_premium_brand boolean NOT NULL DEFAULT false;

-- Seed the flag for national premium operators.
UPDATE public.mvs_operator_watchlist
   SET is_premium_brand = true
 WHERE name IN (
   'Galileo Learning',
   'iD Tech',
   'Steve & Kate''s Camp',
   'Snapology',
   'Lavner Camps',
   'Camp Invention',
   'Stratford Schools Camp'
 );

-- Add the two brands that were auto-Premium in the old hard-coded regex
-- but were missing from the watchlist. British Soccer and Challenger Sports
-- are direct-overlap camp brands with premium pricing.
INSERT INTO public.mvs_operator_watchlist (name, overlap, is_premium_brand, notes, aliases)
VALUES
  ('British Soccer Camps', 'direct', true,
   'National premium soccer camp brand (Challenger-affiliated).',
   ARRAY['British Soccer']::text[]),
  ('Challenger Sports', 'direct', true,
   'National premium multi-sport camp brand.',
   ARRAY[]::text[])
ON CONFLICT DO NOTHING;