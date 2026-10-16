CREATE TABLE public.sequence_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_cache_id text NOT NULL REFERENCES public.campaign_cache(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number >= 1),
  variant_label text NOT NULL CHECK (variant_label IN ('A','B')),
  subject text,
  body text,
  delay_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_cache_id, step_number, variant_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_variants TO authenticated;
GRANT ALL ON public.sequence_variants TO service_role;
ALTER TABLE public.sequence_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view sequence variants" ON public.sequence_variants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert sequence variants" ON public.sequence_variants FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update sequence variants" ON public.sequence_variants FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete sequence variants" ON public.sequence_variants FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));