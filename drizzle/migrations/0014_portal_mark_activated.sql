CREATE OR REPLACE FUNCTION public.portal_mark_activated()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.candidate_portal_users SET activated_at = now()
      WHERE user_id = auth.uid() AND activated_at IS NULL $$;
REVOKE EXECUTE ON FUNCTION public.portal_mark_activated() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.portal_mark_activated() TO authenticated;