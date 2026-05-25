
-- Neuron AI (Global Ask AI v1) — persistence layer
-- Three tables: action audit log, threads, thread messages.
-- All user-scoped via RLS using auth.uid().

CREATE TABLE public.ai_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  route text NOT NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own ai_action_log"
  ON public.ai_action_log FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users insert own ai_action_log"
  ON public.ai_action_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_action_log_user ON public.ai_action_log (user_id, created_at DESC);


CREATE TABLE public.ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  route_at_start text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own ai_threads"
  ON public.ai_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own ai_threads"
  ON public.ai_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own ai_threads"
  ON public.ai_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_threads_user ON public.ai_threads (user_id, last_message_at DESC);


CREATE TABLE public.ai_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  role text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own thread messages"
  ON public.ai_thread_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_threads t
    WHERE t.id = ai_thread_messages.thread_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "users insert own thread messages"
  ON public.ai_thread_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_threads t
    WHERE t.id = ai_thread_messages.thread_id AND t.user_id = auth.uid()
  ));

CREATE INDEX idx_ai_thread_messages_thread ON public.ai_thread_messages (thread_id, created_at);
