create or replace function public.portal_my_profile()
returns table(first_name text, last_name text, email text, phone text, street text, city text, state text, zip text)
language sql stable security definer set search_path to 'public'
as $$
  select c.first_name, c.last_name, c.email, c.phone, c.mailing_street, c.mailing_city, c.mailing_state, c.mailing_zip
  from public.candidate_portal_users u
  join public.candidates c on c.id = u.candidate_id
  where u.user_id = auth.uid()
  limit 1
$$;
revoke all on function public.portal_my_profile() from public, anon;
grant execute on function public.portal_my_profile() to authenticated;