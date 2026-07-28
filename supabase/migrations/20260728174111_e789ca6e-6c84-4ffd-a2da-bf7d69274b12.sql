
CREATE OR REPLACE FUNCTION public.get_top_teacher_cities(_limit int DEFAULT 6)
RETURNS TABLE(city text, state text, n bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT city, state, count(*)::bigint AS n
  FROM public.teacher_prospects
  WHERE city IS NOT NULL AND city <> ''
  GROUP BY city, state
  ORDER BY n DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_teacher_cities(int) TO authenticated, anon;
