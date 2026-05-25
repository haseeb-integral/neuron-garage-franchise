INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'manager'::app_role
FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;