create table public.ai_query_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  thread_id uuid not null,
  parent_id uuid references public.ai_query_history(id) on delete set null,
  query text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index ai_query_history_user_created_idx on public.ai_query_history (user_id, created_at desc);
create index ai_query_history_thread_idx on public.ai_query_history (thread_id, created_at);

alter table public.ai_query_history enable row level security;

create policy "Users can view own AI queries" on public.ai_query_history
  for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own AI queries" on public.ai_query_history
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users can delete own AI queries" on public.ai_query_history
  for delete to authenticated using (user_id = auth.uid());