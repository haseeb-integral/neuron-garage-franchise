-- campaign_cache: keep SELECT, lock writes to staff
DROP POLICY IF EXISTS "Authenticated can insert campaign cache" ON public.campaign_cache;
DROP POLICY IF EXISTS "Authenticated can update campaign cache" ON public.campaign_cache;
DROP POLICY IF EXISTS "Authenticated can delete campaign cache" ON public.campaign_cache;
CREATE POLICY "Staff can insert campaign cache" ON public.campaign_cache FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update campaign cache" ON public.campaign_cache FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete campaign cache" ON public.campaign_cache FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- candidate_activities: staff-only for read and insert
DROP POLICY IF EXISTS "Authenticated can insert candidate activities" ON public.candidate_activities;
DROP POLICY IF EXISTS "Authenticated can read all candidate activities" ON public.candidate_activities;
CREATE POLICY "Staff can read candidate activities" ON public.candidate_activities FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert candidate activities" ON public.candidate_activities FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- city_briefs: keep SELECT, lock writes to staff
DROP POLICY IF EXISTS "Authenticated can insert city_briefs" ON public.city_briefs;
DROP POLICY IF EXISTS "Authenticated can update city_briefs" ON public.city_briefs;
CREATE POLICY "Staff can insert city_briefs" ON public.city_briefs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update city_briefs" ON public.city_briefs FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- custom_criteria: keep SELECT, lock writes to staff
DROP POLICY IF EXISTS "Authenticated can insert custom criteria" ON public.custom_criteria;
DROP POLICY IF EXISTS "Authenticated can update custom criteria" ON public.custom_criteria;
DROP POLICY IF EXISTS "Authenticated can delete custom criteria" ON public.custom_criteria;
CREATE POLICY "Staff can insert custom criteria" ON public.custom_criteria FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update custom criteria" ON public.custom_criteria FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete custom criteria" ON public.custom_criteria FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));