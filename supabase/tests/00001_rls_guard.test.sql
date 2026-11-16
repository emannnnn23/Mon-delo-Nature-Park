begin;
select plan(7);

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

select * from finish();
rollback;
