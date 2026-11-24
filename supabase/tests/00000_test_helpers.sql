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

-- Creates a row in auth.sessions for the user, as Supabase Auth does on sign
-- in, and returns its id. not_after null means no hard end (the default for
-- password sign-ins). Call it as the privileged test user.
create or replace function tests.create_session(
  uid uuid,
  not_after timestamptz default null
) returns uuid
language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.sessions (id, user_id, created_at, updated_at, aal, not_after)
  values (new_id, uid, now(), now(), 'aal1', create_session.not_after);
  return new_id;
end;
$$;

-- Acts as the given user on the given session: sets the JWT claims the way
-- PostgREST and Storage do for a Supabase access token (sub, role,
-- session_id, is_anonymous) and switches to the authenticated role.
-- A null session_id leaves the claim out. extra_claims is merged last, so a
-- test can override or add a claim (for example {"is_anonymous": true}).
-- Transaction-local. Does not check that the session exists: the tests for
-- signed-out and expired sessions rely on that.
create or replace function tests.authenticate_as_session(
  uid uuid,
  session_id uuid,
  extra_claims jsonb default '{}'::jsonb
) returns void
language plpgsql
as $$
declare
  claims jsonb := jsonb_build_object(
    'sub', uid,
    'role', 'authenticated',
    'aud', 'authenticated',
    'is_anonymous', false
  );
begin
  if authenticate_as_session.session_id is not null then
    claims := claims || jsonb_build_object('session_id', authenticate_as_session.session_id);
  end if;
  claims := claims || coalesce(extra_claims, '{}'::jsonb);

  perform set_config('request.jwt.claims', claims::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(claims ->> 'sub', ''), true);
  perform set_config('request.jwt.claim.role', coalesce(claims ->> 'role', ''), true);
  set local role authenticated;
end;
$$;

-- Acts as the given user with a live session: reuses the user's newest live
-- auth.sessions row or creates one, then sets the claims (see
-- authenticate_as_session). Call tests.reset_role() first: it reads and
-- writes auth.sessions, which only the privileged test user (postgres) can.
create or replace function tests.authenticate_as(uid uuid)
returns void
language plpgsql
as $$
declare
  sid uuid;
begin
  select s.id into sid
    from auth.sessions s
   where s.user_id = uid
     and (s.not_after is null or s.not_after > now())
   order by s.created_at desc, s.id
   limit 1;

  if sid is null then
    sid := tests.create_session(uid);
  end if;

  perform tests.authenticate_as_session(uid, sid);
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

-- Runs one statement as the current role and returns how many rows it
-- returned or changed. An update or delete that RLS filters out returns 0
-- without raising, so this is how tests prove a write did nothing.
create or replace function tests.row_count(statement text)
returns bigint
language plpgsql
as $$
declare
  n bigint;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
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
