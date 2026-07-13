
ALTER TABLE public.mvs_operator_watchlist
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}'::text[];

INSERT INTO public.mvs_operator_watchlist (name, overlap, notes, aliases)
VALUES
  ('KidStrong', 'adjacent', 'National kids fitness/athletic franchise; partial summer camp overlap.', '{}'::text[]),
  ('Camp Invention', 'direct', 'National premium STEM summer camp (National Inventors Hall of Fame).', '{}'::text[])
ON CONFLICT DO NOTHING;

UPDATE public.mvs_operator_watchlist
   SET aliases = ARRAY['Bricks4Kidz']
 WHERE name = 'Bricks 4 Kidz';
