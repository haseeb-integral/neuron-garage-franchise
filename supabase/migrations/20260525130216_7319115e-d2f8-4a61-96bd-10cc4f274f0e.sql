
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'manager'::app_role)
      OR public.has_role(_user_id, 'admin'::app_role);
$$;

DO $$
DECLARE
  t text;
  label text;
  tables text[] := ARRAY[
    'candidates','candidate_profiles','prospects_staging',
    'teacher_prospects','smartlead_events','outreach_queue','enrichment_jobs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    label := replace(t,'_',' ');
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can view '   || label, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert ' || label, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can update ' || label, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can delete ' || label, t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))',
                   'Staff can view '   || label, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()))',
                   'Staff can insert ' || label, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))',
                   'Staff can update ' || label, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_staff(auth.uid()))',
                   'Staff can delete ' || label, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Staff can broadcast realtime messages" ON realtime.messages;
CREATE POLICY "Staff can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can broadcast realtime messages"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
