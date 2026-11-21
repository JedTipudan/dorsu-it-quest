-- =====================================================================
-- Create an ADMIN account directly in Supabase (no sign-up page needed)
-- ---------------------------------------------------------------------
-- 1. Change the 3 values in the "EDIT ME" section below.
-- 2. Supabase -> SQL Editor -> New query -> paste this whole file -> Run.
-- 3. Log in at /login with that email + password.
--
-- If the email already exists, the account is NOT recreated: it is simply
-- promoted to admin (and its password is left unchanged).
-- Safe to run more than once.
-- =====================================================================
do $$
declare
  -- ===== EDIT ME =====
  v_email     text := 'admin@dorsu.edu.ph';   -- login email
  v_password  text := 'ChangeMe-123!';        -- login password (admins: min. 4 characters)
  v_full_name text := 'System Administrator'; -- name shown in the app
  -- ===================
  v_user_id uuid;
begin
  v_email := lower(btrim(v_email));
  -- Admin accounts made here may use a shorter password (4+). Students signing up in the
  -- app still need 8+ characters; that rule lives in the app's register form.
  if length(v_password) < 4 then
    raise exception 'Admin password must be at least 4 characters.';
  end if;

  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    -- The login itself (password is bcrypt-hashed; email marked as confirmed).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'display_name', split_part(v_full_name, ' ', 1)),
      now(), now(), '', '', '', ''
    );

    -- Email identity (required for email/password sign-in).
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text, 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );

    raise notice 'Created new account %', v_email;
  else
    raise notice 'Account % already exists, promoting it to admin', v_email;
  end if;

  -- The app's sign-up trigger already created the player profile; make it an admin.
  update public.profiles set role = 'admin' where id = v_user_id;
  if not found then
    raise exception 'No profile found for %. Was supabase/setup.sql run on this project?', v_email;
  end if;
end $$;

-- Check: should list the account with role = admin
select p.email, p.full_name, p.role, p.student_code
from public.profiles p
where p.role = 'admin';
