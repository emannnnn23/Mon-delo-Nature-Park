-- Bind admin access to a live auth session.
--
-- The site is static; the database is the only server, so every admin
-- permission is decided here. Before this migration is_admin() trusted any
-- unexpired access token of a user with an admin profile, so a token kept
-- after sign-out stayed admin until it expired. Now is_admin() is true only
-- when all of these hold for the current request:
--   - the token's role claim is 'authenticated' (not anon, not service_role);
--   - the token is not an anonymous-user token (is_anonymous absent or false);
--   - the token's sub is a UUID and matches auth.uid();
--   - the token's session_id is a row in auth.sessions for that same user,
--     and the row has not passed not_after. Signing out deletes the row, so
--     access ends on the next request, not when the token expires;
--   - the user is not banned (banned_until absent or past) and not
--     soft-deleted (deleted_at null) in auth.users;
--   - the user has a profiles row with role = 'admin'. Deleting it revokes
--     access on the next request.
-- Missing or malformed claims make it false. The claim values are checked
-- with a pattern before any cast, so a bad claim never raises.
--
-- Every admin policy, the dashboard view and the media storage policies call
-- (select public.is_admin()), so this one change tightens all of them.
-- Same signature, language, volatility, security and grants as before;
-- create or replace keeps the owner (postgres) and the existing grants, and
-- the grants are restated below so this file says what it relies on.
-- The owner (postgres) reads auth.sessions and auth.users. Both have RLS
-- enabled with no policies, so the owner needs select on them and BYPASSRLS.

-- Pre-flight: stop the push, inside its transaction and before is_admin() is
-- replaced, if the migration role lacks that access. Without select, the new
-- is_admin() would raise 42501 inside every public read policy that reaches
-- a draft row (an outage for the public site, not a safe denial); without
-- BYPASSRLS it would see no sessions and silently lock every admin out.
do $$
begin
  if not has_table_privilege('auth.sessions', 'select')
     or not has_table_privilege('auth.users', 'select')
     or not coalesce(
       (select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user), false
     ) then
    raise exception 'is_admin needs select on auth.sessions and auth.users, and bypassrls, for %',
      current_user;
  end if;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with token as (
    select coalesce((select auth.jwt()), '{}'::jsonb) as claims
  ),
  parsed as (
    select
      case
        when jsonb_typeof(claims -> 'sub') = 'string'
         and claims ->> 'sub' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (claims ->> 'sub')::uuid
      end as user_id,
      case
        when jsonb_typeof(claims -> 'session_id') = 'string'
         and claims ->> 'session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (claims ->> 'session_id')::uuid
      end as session_id,
      claims ->> 'role' as role,
      coalesce(claims -> 'is_anonymous', 'false'::jsonb) as is_anonymous
    from token
  )
  select exists (
    select 1
    from parsed t
    join public.profiles p
      on p.id = t.user_id
     and p.role = 'admin'
    join auth.sessions s
      on s.id = t.session_id
     and s.user_id = t.user_id
    join auth.users u
      on u.id = s.user_id
    where t.role = 'authenticated'
      and t.is_anonymous = 'false'::jsonb
      and (s.not_after is null or s.not_after > now())
      and (u.banned_until is null or u.banned_until <= now())
      and u.deleted_at is null
      -- auth.uid() is read only once sub is known to be a UUID, so a
      -- malformed sub cannot make it raise.
      and case
            when t.user_id is null then false
            else t.user_id = (select auth.uid())
          end
      and (select auth.role()) = 'authenticated'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
