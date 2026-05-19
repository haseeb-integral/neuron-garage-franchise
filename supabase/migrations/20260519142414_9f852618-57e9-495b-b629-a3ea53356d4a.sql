CREATE POLICY "Authenticated can insert scored cities"
ON public.us_cities_scored
FOR INSERT
TO authenticated
WITH CHECK (true);