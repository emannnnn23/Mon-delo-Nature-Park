begin;
select plan(5);

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

select * from finish();
rollback;
