-- Drop the older 3-arg overload of teacher_prospects_stats. The UI calls the
-- 4-arg version (with p_cities[]) exclusively. Two overloads forced
-- PostgREST to disambiguate by argument shape on every request and meant
-- two functions to keep in sync — collapsed to one.
DROP FUNCTION IF EXISTS public.teacher_prospects_stats(text, text, text);