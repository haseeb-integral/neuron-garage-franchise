INSERT INTO public.mvs_operator_watchlist (name, overlap, notes) VALUES
  ('Galileo Learning',        'direct',   'National premium STEAM summer camps; flagship direct comp.'),
  ('iD Tech',                 'direct',   'National premium tech/STEM camps for ages 7-19.'),
  ('Steve & Kate''s Camp',    'direct',   'National premium all-day multi-activity summer camp.'),
  ('Snapology',               'direct',   'Premium STEM/LEGO camps; franchise model.'),
  ('Lavner Camps',            'direct',   'Premium tech/arts/multi-activity camps.'),
  ('Bricks 4 Kidz',           'adjacent', 'LEGO-based STEM franchise; year-round + camps.'),
  ('Mad Science',             'adjacent', 'Science enrichment + camps; franchise.'),
  ('Code Ninjas',             'adjacent', 'Year-round coding centers + camps.'),
  ('Engineering For Kids',    'adjacent', 'STEM enrichment franchise + camps.'),
  ('Stratford Schools Camp',  'adjacent', 'Premium school-affiliated summer programs.'),
  ('YMCA',                    'distant',  'Community-tier price; methodology excludes from premium comp set.'),
  ('KinderCare',              'distant',  'Childcare-leaning; not enrichment competitor.'),
  ('Sylvan Learning',         'distant',  'Tutoring brand; summer enrichment overlap.'),
  ('Goldfish Swim School',    'distant',  'Single-category (swim) premium; partial overlap.'),
  ('Mathnasium',              'distant',  'Math tutoring franchise; partial summer overlap.')
ON CONFLICT DO NOTHING;

DELETE FROM public.mvs_weeks WHERE provider_id IN (SELECT id FROM public.mvs_providers WHERE city='Austin, TX');
DELETE FROM public.mvs_qa_queue WHERE entity_type='week' AND entity_id IN (SELECT w.id FROM public.mvs_weeks w);
DELETE FROM public.mvs_qa_queue WHERE entity_type='provider' AND entity_id IN (SELECT id FROM public.mvs_providers WHERE city='Austin, TX');
DELETE FROM public.mvs_providers WHERE city='Austin, TX';
DELETE FROM public.mvs_pipeline_runs WHERE city='Austin, TX';
DELETE FROM public.mvs_city_flags WHERE city='Austin, TX';

CREATE UNIQUE INDEX IF NOT EXISTS mvs_providers_city_name_platform_uniq
  ON public.mvs_providers (city, lower(name), platform);
