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
-- The owner reads auth.sessions: postgres has select on it and bypasses RLS.

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
    where t.role = 'authenticated'
      and t.is_anonymous = 'false'::jsonb
      and (s.not_after is null or s.not_after > now())
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
