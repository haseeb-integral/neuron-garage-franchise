DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_seed record;
BEGIN
  FOR v_seed IN
    SELECT * FROM (VALUES
      ('samreed512@gmail.com',       'Sam Reed'),
      ('sam.reed@neurongarage.com',  'Sam Reed'),
      ('kaylie@neurongarage.com',    'Kaylie Reed')
    ) AS t(email, full_name)
  LOOP
    v_email := lower(v_seed.email);
    v_full_name := v_seed.full_name;

    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated', v_email,
        crypt('NeuronGarage2026!', gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', v_full_name),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email', v_user_id::text,
        now(), now(), now()
      );
    END IF;

    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_user_id, v_email, v_full_name)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

    DELETE FROM public.user_roles WHERE user_id = v_user_id AND role <> 'admin';
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;