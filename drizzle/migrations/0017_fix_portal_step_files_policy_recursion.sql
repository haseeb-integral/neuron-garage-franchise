create or replace function public.portal_latest_fdd_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select f.id
  from public.portal_step_files f
  where f.is_fdd and f.deleted_at is null
  order by f.created_at desc
  limit 1
$$;

drop policy if exists "prospect read unlocked step files" on public.portal_step_files;

create policy "prospect read unlocked step files"
on public.portal_step_files
for select
using (
  deleted_at is null
  and step_num <= coalesce(public.portal_current_step(auth.uid())::integer, 0)
  and (not is_fdd or id = public.portal_latest_fdd_id())
);