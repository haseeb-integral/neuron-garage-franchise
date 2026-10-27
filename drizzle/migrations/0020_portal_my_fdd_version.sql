create or replace function public.portal_my_fdd_version()
returns table (fdd_file_id uuid, issuance_date date, file_name text, file_sha256 text, source text)
language sql
stable
security definer
set search_path = public
as $$
  select cc.fdd_file_id, f.fdd_issuance_date, f.file_name, f.file_sha256, 'recorded_sent'::text
  from public.candidate_portal_users u
  join public.candidate_compliance cc on cc.candidate_id = u.candidate_id and cc.fdd_file_id is not null
  left join public.portal_step_files f on f.id = cc.fdd_file_id
  where u.user_id = auth.uid()

  union all

  select e.fdd_file_id, f.fdd_issuance_date, f.file_name, f.file_sha256, 'delivery_log'::text
  from public.candidate_portal_users u
  join lateral (
    select ev.fdd_file_id
    from public.fdd_delivery_events ev
    where ev.candidate_id = u.candidate_id and ev.fdd_file_id is not null
    order by ev.at asc
    limit 1
  ) e on true
  left join public.portal_step_files f on f.id = e.fdd_file_id
  where u.user_id = auth.uid()
    and not exists (
      select 1
      from public.candidate_portal_users u2
      join public.candidate_compliance cc2 on cc2.candidate_id = u2.candidate_id and cc2.fdd_file_id is not null
      where u2.user_id = auth.uid()
    )
  limit 1
$$;

grant execute on function public.portal_my_fdd_version() to authenticated;