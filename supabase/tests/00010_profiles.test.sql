begin;
select plan(12);

select has_table('public', 'profiles', 'profiles table exists');
select policies_are(
  'public', 'profiles', array['profiles_select_own'],
  'profiles has exactly one policy'
);
select is_definer('public', 'is_admin', array[]::text[], 'is_admin is security definer');
select volatility_is('public', 'is_admin', array[]::text[], 'stable', 'is_admin is stable');

select tests.create_user('admin-a@example.test', true) as a \gset
select tests.create_user('user-b@example.test') as b \gset

-- Authenticated non-admin B
select tests.authenticate_as(:'b');
select is((select count(*) from public.profiles), 0::bigint, 'non-admin sees no profiles rows');
select is(public.is_admin(), false, 'non-admin is not admin');
select throws_ok(
  format($q$insert into public.profiles (id, role) values (%L, 'admin')$q$, :'b'),
  '42501',
  null,
  'non-admin cannot make themselves admin'
);
select tests.reset_role();

-- Admin A
select tests.authenticate_as(:'a');
select is(public.is_admin(), true, 'admin is admin');
select results_eq(
  'select id from public.profiles',
  format($q$values (%L::uuid)$q$, :'a'),
  'admin sees exactly their own row'
);
select throws_ok(
  format($q$update public.profiles set role = 'admin' where id = %L$q$, :'b'),
  '42501',
  null,
  'admin cannot update profiles (no update grant)'
);
select tests.reset_role();

-- Anonymous
select tests.as_anon();
select is(public.is_admin(), false, 'anon is not admin');
select throws_ok(
  'select count(*) from public.profiles',
  '42501',
  null,
  'anon has no select grant on profiles'
);
select tests.reset_role();

select * from finish();
rollback;
