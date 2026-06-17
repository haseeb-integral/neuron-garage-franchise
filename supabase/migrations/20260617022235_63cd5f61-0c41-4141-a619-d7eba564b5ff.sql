
CREATE POLICY "mvs-screenshots read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mvs-screenshots');

CREATE POLICY "mvs-screenshots write mgr"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mvs-screenshots'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "mvs-screenshots update mgr"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mvs-screenshots'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "mvs-screenshots delete mgr"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mvs-screenshots'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );
