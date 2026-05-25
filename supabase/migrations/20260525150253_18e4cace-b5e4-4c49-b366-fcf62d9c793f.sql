
-- candidate_checklist_items
DROP POLICY IF EXISTS "Authenticated can view checklist items" ON public.candidate_checklist_items;
DROP POLICY IF EXISTS "Authenticated can insert checklist items" ON public.candidate_checklist_items;
DROP POLICY IF EXISTS "Authenticated can update checklist items" ON public.candidate_checklist_items;
DROP POLICY IF EXISTS "Authenticated can delete checklist items" ON public.candidate_checklist_items;
CREATE POLICY "Staff can view checklist items" ON public.candidate_checklist_items FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert checklist items" ON public.candidate_checklist_items FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update checklist items" ON public.candidate_checklist_items FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete checklist items" ON public.candidate_checklist_items FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- candidate_qualification
DROP POLICY IF EXISTS "Authenticated can view qualification" ON public.candidate_qualification;
DROP POLICY IF EXISTS "Authenticated can insert qualification" ON public.candidate_qualification;
DROP POLICY IF EXISTS "Authenticated can update qualification" ON public.candidate_qualification;
DROP POLICY IF EXISTS "Authenticated can delete qualification" ON public.candidate_qualification;
CREATE POLICY "Staff can view qualification" ON public.candidate_qualification FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert qualification" ON public.candidate_qualification FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update qualification" ON public.candidate_qualification FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete qualification" ON public.candidate_qualification FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- candidate_stage_history
DROP POLICY IF EXISTS "Authenticated can view stage history" ON public.candidate_stage_history;
DROP POLICY IF EXISTS "Authenticated can insert stage history" ON public.candidate_stage_history;
DROP POLICY IF EXISTS "Authenticated can update stage history" ON public.candidate_stage_history;
DROP POLICY IF EXISTS "Authenticated can delete stage history" ON public.candidate_stage_history;
CREATE POLICY "Staff can view stage history" ON public.candidate_stage_history FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert stage history" ON public.candidate_stage_history FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update stage history" ON public.candidate_stage_history FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete stage history" ON public.candidate_stage_history FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- candidate_votes
DROP POLICY IF EXISTS "Authenticated can view votes" ON public.candidate_votes;
DROP POLICY IF EXISTS "Authenticated can insert votes" ON public.candidate_votes;
DROP POLICY IF EXISTS "Authenticated can update votes" ON public.candidate_votes;
DROP POLICY IF EXISTS "Authenticated can delete votes" ON public.candidate_votes;
CREATE POLICY "Staff can view votes" ON public.candidate_votes FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert votes" ON public.candidate_votes FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update votes" ON public.candidate_votes FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete votes" ON public.candidate_votes FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- city_narratives (keep SELECT open to authenticated; restrict writes)
DROP POLICY IF EXISTS "Authenticated can insert city_narratives" ON public.city_narratives;
DROP POLICY IF EXISTS "Authenticated can update city_narratives" ON public.city_narratives;
DROP POLICY IF EXISTS "Authenticated can delete city_narratives" ON public.city_narratives;
CREATE POLICY "Staff can insert city_narratives" ON public.city_narratives FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update city_narratives" ON public.city_narratives FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete city_narratives" ON public.city_narratives FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- imports
DROP POLICY IF EXISTS "Authenticated can view imports" ON public.imports;
DROP POLICY IF EXISTS "Authenticated can insert imports" ON public.imports;
CREATE POLICY "Staff can view imports" ON public.imports FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert imports" ON public.imports FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update imports" ON public.imports FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete imports" ON public.imports FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- onboarding_records
DROP POLICY IF EXISTS "Authenticated can view onboarding records" ON public.onboarding_records;
DROP POLICY IF EXISTS "Authenticated can insert onboarding records" ON public.onboarding_records;
DROP POLICY IF EXISTS "Authenticated can update onboarding records" ON public.onboarding_records;
DROP POLICY IF EXISTS "Authenticated can delete onboarding records" ON public.onboarding_records;
CREATE POLICY "Staff can view onboarding records" ON public.onboarding_records FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert onboarding records" ON public.onboarding_records FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update onboarding records" ON public.onboarding_records FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete onboarding records" ON public.onboarding_records FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- onboarding_steps
DROP POLICY IF EXISTS "Authenticated can view onboarding steps" ON public.onboarding_steps;
DROP POLICY IF EXISTS "Authenticated can insert onboarding steps" ON public.onboarding_steps;
DROP POLICY IF EXISTS "Authenticated can update onboarding steps" ON public.onboarding_steps;
DROP POLICY IF EXISTS "Authenticated can delete onboarding steps" ON public.onboarding_steps;
CREATE POLICY "Staff can view onboarding steps" ON public.onboarding_steps FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert onboarding steps" ON public.onboarding_steps FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update onboarding steps" ON public.onboarding_steps FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete onboarding steps" ON public.onboarding_steps FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- teacher_import_batches
DROP POLICY IF EXISTS "Authenticated can view prospect batches" ON public.teacher_import_batches;
DROP POLICY IF EXISTS "Authenticated can insert prospect batches" ON public.teacher_import_batches;
DROP POLICY IF EXISTS "Authenticated can update prospect batches" ON public.teacher_import_batches;
DROP POLICY IF EXISTS "Authenticated can delete prospect batches" ON public.teacher_import_batches;
CREATE POLICY "Staff can view prospect batches" ON public.teacher_import_batches FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert prospect batches" ON public.teacher_import_batches FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update prospect batches" ON public.teacher_import_batches FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can delete prospect batches" ON public.teacher_import_batches FOR DELETE TO authenticated USING (is_staff(auth.uid()));

-- us_cities_scored (keep SELECT open; restrict writes)
DROP POLICY IF EXISTS "Authenticated can insert scored cities" ON public.us_cities_scored;
DROP POLICY IF EXISTS "Authenticated can update scored cities" ON public.us_cities_scored;
CREATE POLICY "Staff can insert scored cities" ON public.us_cities_scored FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update scored cities" ON public.us_cities_scored FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
