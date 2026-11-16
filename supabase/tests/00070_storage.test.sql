begin;
select plan(14);

-- Bucket
select results_eq(
  $$ select public, file_size_limit, allowed_mime_types::text[]
       from storage.buckets where id = 'media' $$,
  $$ values (true, 5242880::bigint,
             array['image/webp', 'image/jpeg', 'image/png']::text[]) $$,
  'media bucket is public, 5 MiB, webp/jpeg/png only'
);

-- Policies (storage.objects holds Supabase-managed policies too, so assert
-- only the media_objects_* names)
select is(
  (select string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ','),
                     ' ' order by policyname::text)
     from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'media_objects_%'),
  'media_objects_delete_admin:DELETE:authenticated '
  || 'media_objects_insert_admin:INSERT:authenticated '
  || 'media_objects_select_admin:SELECT:authenticated '
  || 'media_objects_update_admin:UPDATE:authenticated',
  'exactly four media_objects policies, each for authenticated'
);
select ok(
  not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'media_objects_%'
       and (qual is distinct from null and qual not like '%bucket_id%media%'
            or with_check is distinct from null and with_check not like '%bucket_id%media%')
  ),
  'every media_objects policy is scoped to the media bucket'
);
select ok(
  (select with_check like '%bucket_id%media%is_admin%' from pg_policies
    where policyname = 'media_objects_insert_admin' and tablename = 'objects'),
  'insert policy checks bucket and is_admin'
);
select ok(
  (select qual like '%bucket_id%media%is_admin%'
      and with_check like '%bucket_id%media%is_admin%' from pg_policies
    where policyname = 'media_objects_update_admin' and tablename = 'objects'),
  'update policy has using and with check on bucket and is_admin'
);

-- Fixtures
select tests.create_user('storage-admin@example.test', true) as admin_id \gset
select tests.create_user('storage-visitor@example.test', false) as user_id \gset
-- The storage schema blocks raw deletes unless the API flag is set.
select set_config('storage.allow_delete_query', 'true', true);

-- Anon
select tests.as_anon();
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('media', 't.webp', null) $$,
  '42501', null, 'anon cannot insert into the media bucket'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'media'), 0,
  'anon sees no objects'
);
select tests.reset_role();

-- Non-admin
select tests.authenticate_as(:'user_id');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('media', 't.webp', null) $$,
  '42501', null, 'non-admin cannot insert into the media bucket'
);
select tests.reset_role();

-- Admin writes
select tests.authenticate_as(:'admin_id');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner, owner_id)
            values ('media', 't.webp', %L, %L) $$, :'admin_id', :'admin_id'),
  'admin can insert into the media bucket'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'media'), 1,
  'admin can list media objects'
);
select tests.reset_role();

-- Non-admin cannot see, update or delete the admin's object
select tests.authenticate_as(:'user_id');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'media'), 0,
  'non-admin cannot list media objects'
);
-- RLS-filtered writes affect 0 rows without raising; verify through state.
update storage.objects set name = 'hijack.webp' where bucket_id = 'media';
delete from storage.objects where bucket_id = 'media' and name = 't.webp';
select tests.reset_role();
select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'media' and name = 't.webp'), 1,
  'non-admin update and delete left the object untouched'
);

-- Admin update and delete
select tests.authenticate_as(:'admin_id');
update storage.objects set name = 't2.webp'
 where bucket_id = 'media' and name = 't.webp';
select tests.reset_role();
select is(
  (select count(*)::int from storage.objects
    where bucket_id = 'media' and name = 't2.webp'), 1,
  'admin can update a media object'
);
select tests.authenticate_as(:'admin_id');
delete from storage.objects where bucket_id = 'media' and name = 't2.webp';
select tests.reset_role();
select is(
  (select count(*)::int from storage.objects where bucket_id = 'media'), 0,
  'admin can delete a media object'
);

select * from finish();
rollback;
