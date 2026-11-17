-- Test helpers. Idempotent and committed (no rollback) so every later pgTAP
-- file can call them. `supabase test db` runs files alphabetically, so this
-- file runs first. It is valid TAP on its own.
create schema if not exists tests;

grant usage on schema tests to anon, authenticated;

-- Creates a row in auth.users (and a profiles row when make_admin) and returns
-- its id. Call it as the privileged test user, before switching roles.
create or replace function tests.create_user(
  email text,
  make_admin boolean default false
) returns uuid
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    create_user.email,
    extensions.crypt('test-password-not-real', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  if make_admin then
    insert into public.profiles (id, full_name, role)
    values (new_id, 'Test Admin', 'admin');
  end if;

  return new_id;
end;
$$;

-- Acts as the given user: sets the JWT claims (so auth.uid() returns uid) and
-- switches to the authenticated role. Transaction-local.
create or replace function tests.authenticate_as(uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end;
$$;

-- Acts as an anonymous visitor: clears the claims and switches to anon.
create or replace function tests.as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  set local role anon;
end;
$$;

-- Returns to the privileged test user.
create or replace function tests.reset_role()
returns void
language plpgsql
as $$
begin
  reset role;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select pass('test helpers installed');
select * from finish();
