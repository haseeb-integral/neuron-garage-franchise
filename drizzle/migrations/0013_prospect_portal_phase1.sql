CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL))
  ON CONFLICT (id) DO NOTHING;
  -- No automatic staff role. Admins grant staff access on purpose.
  RETURN NEW;
END;
$function$;

CREATE TABLE public.candidate_portal_users (
  user_id uuid PRIMARY KEY,
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_portal_users TO authenticated;
GRANT ALL ON public.candidate_portal_users TO service_role;
ALTER TABLE public.candidate_portal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage portal users" ON public.candidate_portal_users FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Prospect reads own link" ON public.candidate_portal_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.portal_candidate_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT candidate_id FROM public.candidate_portal_users WHERE user_id = _user_id $$;
REVOKE EXECUTE ON FUNCTION public.portal_candidate_id(uuid) FROM anon;