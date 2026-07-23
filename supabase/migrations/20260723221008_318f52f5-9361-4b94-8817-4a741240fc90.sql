
DROP POLICY "mvs_city_flags read all" ON public.mvs_city_flags;
CREATE POLICY "mvs_city_flags read all" ON public.mvs_city_flags FOR SELECT TO authenticated USING (true);

DROP POLICY "Team can view all saved sites" ON public.site_saved_sites;
CREATE POLICY "Owners or staff can view saved sites" ON public.site_saved_sites FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
