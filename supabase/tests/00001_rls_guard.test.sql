begin;
select plan(12);

-- Every ordinary or partitioned table in public, as pg_class rows.
create temporary table guard_tables on commit drop as
select c.oid, c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p');

select cmp_ok(
  (select count(*) from guard_tables), '>', 0::bigint,
  'guard inspects at least one public table'
);

select is(
  (select count(*) from guard_tables where not relrowsecurity),
  0::bigint,
  'every public table has row level security enabled'
);

select is(
  (
    select count(*)
    from guard_tables t
    where not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t.relname
    )
  ),
  0::bigint,
  'every public table has at least one policy'
);

select is(
  (
    select count(*)
    from guard_tables t
    cross join unnest(array['TRUNCATE', 'REFERENCES', 'TRIGGER']) as priv
    where has_table_privilege('anon', t.oid, priv)
  ),
  0::bigint,
  'anon has no TRUNCATE, REFERENCES or TRIGGER on any public table'
);

select is(
  (
    select count(*)
    from guard_tables t
    cross join unnest(array['TRUNCATE', 'REFERENCES', 'TRIGGER']) as priv
    where has_table_privilege('authenticated', t.oid, priv)
  ),
  0::bigint,
  'authenticated has no TRUNCATE, REFERENCES or TRIGGER on any public table'
);

-- Functions in public must not be executable by PUBLIC. Functions that are
-- deliberately open to anon/authenticated are granted to those roles by name.
-- Allowlist for functions that may be PUBLIC-executable (currently none;
-- is_admin is granted to anon/authenticated, not PUBLIC).
select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
      and p.proname <> all (array[]::text[])
      and has_function_privilege('public', p.oid, 'execute')
  ),
  0::bigint,
  'no function in public is executable by PUBLIC (outside the allowlist)'
);

select ok(
  has_function_privilege('anon', 'public.is_admin()', 'execute')
    and has_function_privilege('authenticated', 'public.is_admin()', 'execute')
    and not has_function_privilege('public', 'public.is_admin()', 'execute'),
  'is_admin is executable by anon and authenticated but not by PUBLIC'
);

-- Views must run with the caller's privileges (and so the caller's RLS).
select cmp_ok(
  (select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'),
  '>', 0::bigint,
  'guard inspects at least one public view'
);

select is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and not coalesce(c.reloptions @> array['security_invoker=true'], false)
  ),
  0::bigint,
  'every public view has security_invoker = true'
);

-- Anonymous visitors never write directly; the contact RPC is the only path.
select is(
  (
    select count(*)
    from guard_tables t
    cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as priv
    where has_table_privilege('anon', t.oid, priv)
  ),
  0::bigint,
  'anon has no INSERT, UPDATE or DELETE on any public table'
);

-- The fail-closed default privileges set by the base migration must exist:
-- schema-level rows for tables, functions and sequences created by postgres
-- that grant nothing to anon/authenticated, plus the global row that removes
-- the PUBLIC execute default on functions.
select is(
  (
    select count(*)
    from pg_default_acl d
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype in ('r', 'f', 'S')
      and not exists (
        select 1
        from aclexplode(d.defaclacl) a
        where a.grantee in ('anon'::regrole, 'authenticated'::regrole)
      )
  ),
  3::bigint,
  'postgres default privileges in public (tables, functions, sequences) exclude anon and authenticated'
);

select is(
  (
    select count(*)
    from pg_default_acl d
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 0
      and d.defaclobjtype = 'f'
      and not exists (
        select 1 from aclexplode(d.defaclacl) a where a.grantee = 0
      )
  ),
  1::bigint,
  'postgres global function default privileges do not grant EXECUTE to PUBLIC'
);

select * from finish();
rollback;
