-- 1) Restrict internal operational tables to staff only
DROP POLICY IF EXISTS "Authenticated can view campaign cache" ON public.campaign_cache;
CREATE POLICY "Staff can view campaign cache"
  ON public.campaign_cache FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "mvs_runs read auth" ON public.mvs_pipeline_runs;
CREATE POLICY "mvs_runs read staff"
  ON public.mvs_pipeline_runs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "mvs_providers read auth" ON public.mvs_providers;
CREATE POLICY "mvs_providers read staff"
  ON public.mvs_providers FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 2) Topic-scope the realtime message policies
DROP POLICY IF EXISTS "Staff can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Staff can broadcast realtime messages" ON realtime.messages;

CREATE POLICY "Staff can read own scoped realtime topics"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    AND (
      realtime.topic() IN (
        'candidates-count-stream',
        'candidate-pipeline-live',
        'smartlead_events_inbox',
        'triage-events'
      )
      OR realtime.topic() LIKE ('notifications-live-' || auth.uid()::text || '-%')
    )
  );

CREATE POLICY "Staff can broadcast on scoped realtime topics"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND (
      realtime.topic() IN (
        'candidates-count-stream',
        'candidate-pipeline-live',
        'smartlead_events_inbox',
        'triage-events'
      )
      OR realtime.topic() LIKE ('notifications-live-' || auth.uid()::text || '-%')
    )
  );