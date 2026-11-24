begin;
select plan(52);

-- is_admin() is the one server-side admin gate: every admin policy, the
-- dashboard view and the media storage policies call it. It must be true only
-- for an authenticated, non-anonymous token whose session_id is a live
-- auth.sessions row of the same user, and whose user has an admin profile.

-- Shape -----------------------------------------------------------------------
select is_definer('public', 'is_admin', array[]::text[], 'is_admin is security definer');
select volatility_is('public', 'is_admin', array[]::text[], 'stable', 'is_admin is stable');
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc
    where oid = 'public.is_admin()'::regprocedure),
  'is_admin pins search_path to empty'
);
select is(
  (select proowner::regrole::text from pg_proc where oid = 'public.is_admin()'::regprocedure),
  'postgres', 'is_admin is owned by postgres'
);
select ok(
  has_function_privilege('anon', 'public.is_admin()', 'execute')
    and has_function_privilege('authenticated', 'public.is_admin()', 'execute')
    and not has_function_privilege('public', 'public.is_admin()', 'execute'),
  'is_admin is executable by anon and authenticated only'
);
select ok(
  has_table_privilege('postgres', 'auth.sessions', 'select'),
  'the function owner can read auth.sessions'
);

-- Fixtures (as postgres) --------------------------------------------------------
select tests.create_user('session-admin@example.test', true) as a \gset
select tests.create_user('session-other-admin@example.test', true) as o \gset
select tests.create_user('session-user@example.test') as b \gset

delete from public.page_sections;
insert into public.page_sections (id, page, key, heading, is_published)
values ('00000000-0000-0000-0000-000000008501', 'home', 'hero', 'Draft heading', false);

select tests.create_session(:'a') as live \gset
select tests.create_session(:'o') as other_live \gset
select tests.create_session(:'b') as user_live \gset
select tests.create_session(:'a', now() - interval '1 minute') as expired \gset
select tests.create_session(:'a', now() + interval '1 hour') as bounded \gset

-- Admin with a live session ------------------------------------------------------
select tests.authenticate_as_session(:'a', :'live');
select is(public.is_admin(), true, 'admin with a live session is admin');
select is(
  (select count(*) from public.page_sections), 1::bigint,
  'admin with a live session sees draft sections'
);
select lives_ok(
  $q$insert into public.page_sections (id, page, key, heading)
     values ('00000000-0000-0000-0000-000000008502', 'about', 'story', 'New')$q$,
  'admin with a live session inserts a section'
);
select is(
  tests.row_count($q$update public.page_sections set heading = 'Edited'
                     where id = '00000000-0000-0000-0000-000000008502'$q$),
  1::bigint, 'admin with a live session updates a section'
);
select is(
  tests.row_count($q$delete from public.page_sections
                     where id = '00000000-0000-0000-0000-000000008502'$q$),
  1::bigint, 'admin with a live session deletes a section'
);
select is(
  tests.row_count($q$update public.site_settings set tagline = 'Live edit'$q$),
  1::bigint, 'admin with a live session updates site_settings'
);
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded');
select is(public.is_admin(), true, 'a session whose not_after is in the future is live');
select tests.reset_role();

-- Signed out: the session row is deleted, the token is still unexpired ----------
delete from auth.sessions where id = :'live';

select tests.authenticate_as_session(:'a', :'live');
select is(public.is_admin(), false, 'admin is not admin once the session is signed out');
select is(
  (select count(*) from public.page_sections), 0::bigint,
  'a signed-out session no longer sees draft sections'
);
select throws_ok(
  $q$insert into public.page_sections (page, key, heading) values ('about', 'story', 'New')$q$,
  '42501', null, 'a signed-out session cannot insert a section'
);
select is(
  tests.row_count($q$update public.page_sections set heading = 'hacked'$q$),
  0::bigint, 'a signed-out session updates no section'
);
select is(
  tests.row_count($q$delete from public.page_sections$q$),
  0::bigint, 'a signed-out session deletes no section'
);
select is(
  tests.row_count($q$update public.site_settings set tagline = 'hacked'$q$),
  0::bigint, 'a signed-out session cannot update site_settings'
);
select is(
  (select count(*) from public.recent_content_updates), 0::bigint,
  'a signed-out session sees nothing in the dashboard view'
);
select throws_ok(
  $q$insert into storage.objects (bucket_id, name) values ('media', 'signed-out.webp')$q$,
  '42501', null, 'a signed-out session cannot upload to the media bucket'
);
select tests.reset_role();

select is(
  (select count(*) from public.page_sections
    where id = '00000000-0000-0000-0000-000000008501' and heading = 'Draft heading'),
  1::bigint, 'the signed-out writes left the section untouched'
);
select is(
  (select count(*) from public.site_settings where tagline = 'hacked'), 0::bigint,
  'the signed-out writes left site_settings untouched'
);

-- Signing in again (a new session) restores access ---------------------------------
select tests.create_session(:'a') as relogin \gset
select tests.authenticate_as_session(:'a', :'relogin');
select is(public.is_admin(), true, 'a new live session restores admin access');
select tests.reset_role();

-- Expired session (not_after in the past) ------------------------------------------
select tests.authenticate_as_session(:'a', :'expired');
select is(public.is_admin(), false, 'a session past its not_after is not admin');
select is(
  tests.row_count($q$update public.page_sections set heading = 'hacked'$q$),
  0::bigint, 'an expired session updates no section'
);
select tests.reset_role();

-- A session that belongs to someone else --------------------------------------------
select tests.authenticate_as_session(:'a', :'other_live');
select is(public.is_admin(), false, 'another admin''s session id does not make the token admin');
select tests.reset_role();
select tests.authenticate_as_session(:'a', :'user_live');
select is(public.is_admin(), false, 'a non-admin''s session id does not make the token admin');
select tests.reset_role();

-- Missing or malformed claims: false, never an error ---------------------------------
select tests.authenticate_as_session(:'a', null);
select is(public.is_admin(), false, 'a token without session_id is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', gen_random_uuid());
select is(public.is_admin(), false, 'a session_id with no auth.sessions row is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', null, '{"session_id": "not-a-uuid"}');
select lives_ok($q$select public.is_admin()$q$, 'a malformed session_id does not raise');
select is(public.is_admin(), false, 'a malformed session_id is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', null, '{"session_id": 42}');
select is(public.is_admin(), false, 'a non-string session_id is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded', '{"is_anonymous": true}');
select is(public.is_admin(), false, 'an anonymous-user token is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded', '{"is_anonymous": "yes"}');
select lives_ok($q$select public.is_admin()$q$, 'a malformed is_anonymous does not raise');
select is(public.is_admin(), false, 'a malformed is_anonymous is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded', '{"is_anonymous": null}');
select is(public.is_admin(), false, 'a null is_anonymous is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded', '{"role": "anon"}');
select is(public.is_admin(), false, 'a token whose role claim is not authenticated is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded', '{"sub": "not-a-uuid"}');
select is(public.is_admin(), false, 'a malformed sub is not admin');
select tests.reset_role();

select tests.authenticate_as_session(:'a', :'bounded', '{"sub": null}');
select is(public.is_admin(), false, 'a token without sub is not admin');
select tests.reset_role();

-- The sub claim and auth.uid() must agree (auth.uid() prefers the legacy
-- request.jwt.claim.sub setting).
select tests.authenticate_as_session(:'a', :'bounded');
select set_config('request.jwt.claim.sub', :'b', true);
select is(public.is_admin(), false, 'a sub that disagrees with auth.uid() is not admin');
select tests.reset_role();

-- Profile removed while the session is still live ----------------------------------
select tests.authenticate_as_session(:'a', :'bounded');
select is(public.is_admin(), true, 'admin is admin before the profile is removed');
select tests.reset_role();
delete from public.profiles where id = :'a';
select tests.authenticate_as_session(:'a', :'bounded');
select is(public.is_admin(), false, 'a live session without an admin profile is not admin');
select is(
  tests.row_count($q$update public.page_sections set heading = 'hacked'$q$),
  0::bigint, 'a user whose profile was removed updates no section'
);
select tests.reset_role();

-- Banned or soft-deleted user with a live session ----------------------------------
select tests.create_user('session-banned@example.test', true) as z \gset
select tests.create_session(:'z') as z_live \gset

update auth.users set banned_until = now() + interval '1 day' where id = :'z';
select tests.authenticate_as_session(:'z', :'z_live');
select is(public.is_admin(), false, 'a banned admin with a live session is not admin');
select tests.reset_role();

update auth.users set banned_until = now() - interval '1 minute' where id = :'z';
select tests.authenticate_as_session(:'z', :'z_live');
select is(public.is_admin(), true, 'an admin whose ban has expired is admin again');
select tests.reset_role();

update auth.users set banned_until = null, deleted_at = now() where id = :'z';
select tests.authenticate_as_session(:'z', :'z_live');
select is(public.is_admin(), false, 'a soft-deleted admin with a live session is not admin');
select tests.reset_role();

-- Non-admin with a live session ---------------------------------------------------
select tests.authenticate_as_session(:'b', :'user_live');
select is(public.is_admin(), false, 'a non-admin with a live session is not admin');
select throws_ok(
  $q$insert into public.page_sections (page, key, heading) values ('about', 'story', 'New')$q$,
  '42501', null, 'a non-admin with a live session cannot insert a section'
);
select tests.reset_role();

-- Anonymous ----------------------------------------------------------------------
select tests.as_anon();
select is(public.is_admin(), false, 'anon is not admin');
select tests.reset_role();

-- Deleting the user removes the session and the profile together -----------------
select tests.authenticate_as_session(:'o', :'other_live');
select is(public.is_admin(), true, 'the other admin is admin with a live session');
select tests.reset_role();
delete from auth.users where id = :'o';
select tests.authenticate_as_session(:'o', :'other_live');
select is(public.is_admin(), false, 'a deleted user''s token is not admin');
select tests.reset_role();

select * from finish();
rollback;
