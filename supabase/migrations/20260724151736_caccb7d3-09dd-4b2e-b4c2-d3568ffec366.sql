
REVOKE ALL ON FUNCTION public.mvs_resume_stuck_b3_runs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mvs_resume_stuck_b3_runs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mvs_resume_stuck_b3_runs() TO service_role, postgres;
