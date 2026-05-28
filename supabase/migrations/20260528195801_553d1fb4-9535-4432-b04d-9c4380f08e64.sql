-- Dedupe candidates by lower(email): keep oldest row, merge prospect_id if missing,
-- repoint dependent FKs, then delete duplicates and add a unique index.

WITH ranked AS (
  SELECT id, lower(email) AS k,
         row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates
  WHERE email IS NOT NULL AND email <> ''
),
dupes AS (
  SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1
)
UPDATE public.candidate_checklist_items c
   SET candidate_id = d.keeper_id
  FROM dupes d WHERE c.candidate_id = d.dup_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
UPDATE public.candidate_stage_history t SET candidate_id = d.keeper_id
  FROM dupes d WHERE t.candidate_id = d.dup_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
UPDATE public.candidate_votes t SET candidate_id = d.keeper_id
  FROM dupes d WHERE t.candidate_id = d.dup_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
UPDATE public.onboarding_records t SET candidate_id = d.keeper_id
  FROM dupes d WHERE t.candidate_id = d.dup_id;

-- Merge candidate_profiles / candidate_qualification: keep keeper's row if exists, else move dup's
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
DELETE FROM public.candidate_profiles p
  USING dupes d
 WHERE p.candidate_id = d.dup_id
   AND EXISTS (SELECT 1 FROM public.candidate_profiles k WHERE k.candidate_id = d.keeper_id);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
UPDATE public.candidate_profiles p SET candidate_id = d.keeper_id
  FROM dupes d WHERE p.candidate_id = d.dup_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
DELETE FROM public.candidate_qualification q
  USING dupes d
 WHERE q.candidate_id = d.dup_id
   AND EXISTS (SELECT 1 FROM public.candidate_qualification k WHERE k.candidate_id = d.keeper_id);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id FROM ranked WHERE rn > 1)
UPDATE public.candidate_qualification q SET candidate_id = d.keeper_id
  FROM dupes d WHERE q.candidate_id = d.dup_id;

-- Backfill prospect_id on keeper from dup if keeper lacks one
WITH ranked AS (
  SELECT id, prospect_id,
         row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
),
dupes AS (SELECT id AS dup_id, keeper_id, prospect_id FROM ranked WHERE rn > 1 AND prospect_id IS NOT NULL)
UPDATE public.candidates c
   SET prospect_id = d.prospect_id
  FROM dupes d
 WHERE c.id = d.keeper_id AND c.prospect_id IS NULL;

-- Delete duplicate candidate rows
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at ASC, id ASC) AS rn
  FROM public.candidates WHERE email IS NOT NULL AND email <> ''
)
DELETE FROM public.candidates c
  USING ranked r
 WHERE c.id = r.id AND r.rn > 1;

-- Permanent guard: case-insensitive unique email
CREATE UNIQUE INDEX IF NOT EXISTS candidates_email_lower_uidx
  ON public.candidates (lower(email))
  WHERE email IS NOT NULL AND email <> '';