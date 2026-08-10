ALTER TABLE public.candidate_files DROP CONSTRAINT candidate_files_category_check;
ALTER TABLE public.candidate_files ADD CONSTRAINT candidate_files_category_check
  CHECK (category = ANY (ARRAY['general','background_check','credit_check','facility_form','marketing_plan','fdd_proof','fa_proof','homework']));