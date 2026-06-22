ALTER TABLE public.site_analysis_decisions
DROP CONSTRAINT IF EXISTS site_analysis_decisions_verdict_check;

UPDATE public.site_analysis_decisions
SET verdict = CASE verdict
  WHEN 'recommend' THEN 'strong'
  WHEN 'worth_a_look' THEN 'medium'
  WHEN 'dont_recommend' THEN 'low'
  WHEN 'pursue' THEN 'strong'
  WHEN 'hold' THEN 'medium'
  WHEN 'drop' THEN 'low'
  ELSE 'undecided'
END
WHERE verdict IN ('recommend', 'worth_a_look', 'dont_recommend', 'pursue', 'hold', 'drop');

ALTER TABLE public.site_analysis_decisions
ADD CONSTRAINT site_analysis_decisions_verdict_check
CHECK (verdict IN ('strong','high','medium','low','undecided'));