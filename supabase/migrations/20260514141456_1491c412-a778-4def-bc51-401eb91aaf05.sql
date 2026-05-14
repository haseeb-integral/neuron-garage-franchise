create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  city_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, city_id)
);
create index watchlist_items_user_created_idx on public.watchlist_items (user_id, created_at desc);
alter table public.watchlist_items enable row level security;

create policy "Users can view own watchlist"
  on public.watchlist_items for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own watchlist"
  on public.watchlist_items for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own watchlist"
  on public.watchlist_items for delete
  to authenticated
  using (user_id = auth.uid());