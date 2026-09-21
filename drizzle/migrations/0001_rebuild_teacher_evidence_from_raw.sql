-- allow verified fact evidence rows
ALTER TABLE public.teacher_evidence DROP CONSTRAINT IF EXISTS teacher_evidence_evidence_class_check;
ALTER TABLE public.teacher_evidence ADD CONSTRAINT teacher_evidence_evidence_class_check
  CHECK (evidence_class = ANY (ARRAY['verified_creator'::text, 'verified_fact'::text, 'secondary'::text]));

-- allow HIGH for verified facts
ALTER TABLE public.teacher_evidence DROP CONSTRAINT IF EXISTS teacher_evidence_confidence_check;
ALTER TABLE public.teacher_evidence ADD CONSTRAINT teacher_evidence_confidence_check
  CHECK (confidence IS NULL OR confidence = ANY (ARRAY['HIGH'::text,'MEDIUM'::text, 'LOW'::text]));

-- dedupe must allow several distinct signals sharing one source url
DROP INDEX IF EXISTS public.teacher_evidence_dedupe_uidx;
CREATE UNIQUE INDEX teacher_evidence_dedupe_uidx ON public.teacher_evidence
  (teacher_id, evidence_class, COALESCE(source_url,''), COALESCE(signal_type,''), md5(COALESCE(summary,'')));

-- rebuild secondary (side-business) evidence from stored raw payload
WITH src AS (
  SELECT id AS teacher_id,
         regexp_split_to_array(raw->>'secondary_signal_details', '\s*\|\s*')     AS details,
         regexp_split_to_array(coalesce(raw->>'secondary_signal_sources',''), '\s*\|\s*')     AS sources,
         regexp_split_to_array(coalesce(raw->>'secondary_signal_source_urls',''), '\s*\|\s*') AS urls,
         regexp_split_to_array(coalesce(raw->>'secondary_signal_confidence',''), '\s*\|\s*')  AS confs,
         raw->>'secondary_signal_match_basis' AS basis
  FROM public.teacher_prospects
  WHERE raw ? 'secondary_signal_details'
    AND coalesce(raw->>'secondary_signal_details','') <> ''
), expanded AS (
  SELECT teacher_id,
         i,
         details[i] AS detail,
         COALESCE(sources[i], sources[1]) AS source_label,
         COALESCE(urls[i], urls[1])       AS source_url,
         upper(trim(COALESCE(confs[i], confs[array_length(confs,1)]))) AS confidence,
         basis
  FROM src, generate_subscripts(src.details, 1) AS i
)
INSERT INTO public.teacher_evidence
  (teacher_id, evidence_class, signal_type, summary, source_url, source_label, confidence, match_basis)
SELECT teacher_id,
       'secondary',
       CASE
         WHEN source_label ILIKE '%real estate%' OR detail ILIKE '%TREC%' THEN 'real_estate_license'
         WHEN source_label ILIKE '%insurance%'  OR detail ILIKE '%TDI%'  THEN 'insurance_license'
         WHEN source_label ILIKE '%licensing and regulation%' THEN 'occupational_license'
         ELSE 'side_business_signal'
       END,
       NULLIF(trim(detail), ''),
       NULLIF(trim(source_url), ''),
       NULLIF(trim(source_label), ''),
       CASE WHEN confidence IN ('MEDIUM','LOW') THEN confidence ELSE NULL END,
       NULLIF(trim(basis), '')
FROM expanded
WHERE trim(COALESCE(detail,'')) <> ''
ON CONFLICT DO NOTHING;

-- rebuild verified fact evidence from the stored fact labels
INSERT INTO public.teacher_evidence
  (teacher_id, evidence_class, signal_type, summary, source_url, source_label, confidence, match_basis)
SELECT tp.id, 'verified_fact', t.label, NULL, NULL, tp.enrichment_source, 'HIGH', NULL
FROM public.teacher_prospects tp
CROSS JOIN LATERAL unnest(tp.verified_enrichment_signal_types) AS t(label)
WHERE tp.verified_enrichment_signal_types IS NOT NULL
ON CONFLICT DO NOTHING;

-- creator evidence, when a summary exists in raw
INSERT INTO public.teacher_evidence
  (teacher_id, evidence_class, signal_type, summary, source_url, source_label, confidence, match_basis)
SELECT id, 'verified_creator', 'creator_signal',
       NULLIF(trim(raw->>'verified_creator_summary'),''),
       NULLIF(trim(raw->>'verified_creator_source_urls'),''),
       NULL, 'HIGH', NULL
FROM public.teacher_prospects
WHERE coalesce(raw->>'verified_creator_summary','') <> ''
ON CONFLICT DO NOTHING;