begin;
select plan(49);

select policies_are(
  'public', 'site_settings',
  array['site_settings_select_public', 'site_settings_update_admin'],
  'site_settings has exactly its select and update policies'
);
select policies_are(
  'public', 'media',
  array['media_select_public', 'media_insert_admin', 'media_update_admin', 'media_delete_admin'],
  'media has exactly one policy per operation'
);
select policies_are(
  'public', 'page_sections',
  array[
    'page_sections_select_published', 'page_sections_insert_admin',
    'page_sections_update_admin', 'page_sections_delete_admin'
  ],
  'page_sections has exactly one policy per operation'
);

select tests.create_user('admin-a@example.test', true) as a \gset
select tests.create_user('user-b@example.test') as b \gset

-- Clean slate: seed.sql inserts rows this test counts and reuses keys of.
-- Everything is rolled back with the transaction.
delete from public.site_settings;
delete from public.page_sections;
delete from public.attractions;
delete from public.gallery_images;
delete from public.gallery_categories;

-- Seed as postgres (before switching roles).
-- updated_at is set explicitly to an old value on insert; the update trigger
-- only fires on update, so this gives a baseline that works inside one transaction.
insert into public.media (id, storage_base_path, alt_text, width, height, variants, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '2026/sec-aaaaaa', 'Section photo', 1600, 900,
   '{"480": "2026/sec-aaaaaa-480.webp"}'::jsonb, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000a2', '2026/og-bbbbbb', 'Share image', 1200, 630,
   '{"480": "2026/og-bbbbbb-480.webp"}'::jsonb, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000a3', '2026/free-cccccc', 'Unreferenced photo', 800, 600,
   '{"480": "2026/free-cccccc-480.webp"}'::jsonb, '2000-01-01 00:00:00+00');

insert into public.site_settings (id, park_name, default_og_media_id, updated_at)
values ('00000000-0000-0000-0000-0000000000b1', 'Test Park',
        '00000000-0000-0000-0000-0000000000a2', '2000-01-01 00:00:00+00');

insert into public.page_sections (id, page, key, heading, media_id, is_published, updated_at)
values
  ('00000000-0000-0000-0000-0000000000c1', 'home', 'hero', 'Published heading',
   '00000000-0000-0000-0000-0000000000a1', true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000c2', 'home', 'intro', 'Draft heading',
   null, false, '2000-01-01 00:00:00+00');

-- Constraints (as postgres)
select throws_ok(
  $q$insert into public.site_settings (park_name) values ('Second')$q$,
  '23505', null, 'a second site_settings row is rejected (singleton)'
);
select throws_ok(
  $q$update public.site_settings set singleton = false$q$,
  '23514', null, 'singleton cannot be turned off'
);
select throws_ok(
  $q$delete from public.media where id = '00000000-0000-0000-0000-0000000000a1'$q$,
  '23503', null, 'media referenced by a section cannot be deleted'
);
select throws_ok(
  $q$delete from public.media where id = '00000000-0000-0000-0000-0000000000a2'$q$,
  '23503', null, 'media used as the default share image cannot be deleted'
);
select throws_ok(
  $q$insert into public.media (storage_base_path, alt_text, width, height, variants)
     values ('2026/x', '   ', 10, 10, '{}'::jsonb)$q$,
  '23514', null, 'blank alt text is rejected'
);
select throws_ok(
  $q$insert into public.media (storage_base_path, alt_text, width, height, variants, focal_x)
     values ('2026/x', 'ok', 10, 10, '{}'::jsonb, 101)$q$,
  '23514', null, 'focal_x above 100 is rejected'
);
select throws_ok(
  $q$insert into public.page_sections (page, key) values ('contact', 'hero')$q$,
  '23514', null, 'unknown page is rejected'
);
select throws_ok(
  $q$insert into public.page_sections (page, key) values ('home', 'hero')$q$,
  '23505', null, 'duplicate (page, key) is rejected'
);

-- updated_at maintenance
update public.media set alt_text = 'Section photo, edited'
  where id = '00000000-0000-0000-0000-0000000000a1';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.media
   where id = '00000000-0000-0000-0000-0000000000a1'),
  'media.updated_at changes on update'
);
update public.site_settings set tagline = 'Edited';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.site_settings),
  'site_settings.updated_at changes on update'
);
update public.page_sections set heading = 'Edited heading'
  where id = '00000000-0000-0000-0000-0000000000c1';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.page_sections
   where id = '00000000-0000-0000-0000-0000000000c1'),
  'page_sections.updated_at changes on update'
);

-- Anonymous
select tests.as_anon();
select is((select count(*) from public.site_settings), 1::bigint, 'anon reads site_settings');
select is((select count(*) from public.media), 3::bigint, 'anon reads all media');
select is(
  (select count(*) from public.page_sections), 1::bigint,
  'anon sees only published sections'
);
select throws_ok(
  $q$insert into public.site_settings (singleton, park_name) values (true, 'x')$q$,
  '42501', null, 'anon cannot insert site_settings'
);
select throws_ok(
  $q$update public.site_settings set tagline = 'hacked'$q$,
  '42501', null, 'anon cannot update site_settings'
);
select throws_ok(
  $q$delete from public.site_settings$q$,
  '42501', null, 'anon cannot delete site_settings'
);
select throws_ok(
  $q$insert into public.media (storage_base_path, alt_text, width, height, variants)
     values ('2026/x', 'x', 10, 10, '{}'::jsonb)$q$,
  '42501', null, 'anon cannot insert media'
);
select throws_ok(
  $q$update public.media set alt_text = 'hacked'$q$,
  '42501', null, 'anon cannot update media'
);
select throws_ok(
  $q$delete from public.media$q$,
  '42501', null, 'anon cannot delete media'
);
select throws_ok(
  $q$insert into public.page_sections (page, key) values ('home', 'visit')$q$,
  '42501', null, 'anon cannot insert page_sections'
);
select throws_ok(
  $q$update public.page_sections set heading = 'hacked'$q$,
  '42501', null, 'anon cannot update page_sections'
);
select throws_ok(
  $q$delete from public.page_sections$q$,
  '42501', null, 'anon cannot delete page_sections'
);
select tests.reset_role();

-- Authenticated non-admin
select tests.authenticate_as(:'b');
select is((select count(*) from public.site_settings), 1::bigint, 'non-admin reads site_settings');
select is((select count(*) from public.media), 3::bigint, 'non-admin reads all media');
select is(
  (select count(*) from public.page_sections), 1::bigint,
  'non-admin sees only published sections'
);
select throws_ok(
  $q$insert into public.site_settings (singleton, park_name) values (true, 'x')$q$,
  '42501', null, 'non-admin cannot insert site_settings'
);
select throws_ok(
  $q$delete from public.site_settings$q$,
  '42501', null, 'non-admin cannot delete site_settings (no grant)'
);
select throws_ok(
  $q$insert into public.media (storage_base_path, alt_text, width, height, variants)
     values ('2026/x', 'x', 10, 10, '{}'::jsonb)$q$,
  '42501', null, 'non-admin cannot insert media'
);
select throws_ok(
  $q$insert into public.page_sections (page, key) values ('home', 'visit')$q$,
  '42501', null, 'non-admin cannot insert page_sections'
);
-- Updates and deletes filtered out by RLS affect 0 rows without raising.
update public.site_settings set tagline = 'hacked';
update public.media set alt_text = 'hacked';
update public.page_sections set heading = 'hacked';
delete from public.media;
delete from public.page_sections;
select tests.reset_role();

select is(
  (select count(*) from public.site_settings where tagline = 'hacked')
  + (select count(*) from public.media where alt_text = 'hacked')
  + (select count(*) from public.page_sections where heading = 'hacked'),
  0::bigint,
  'non-admin updates changed nothing'
);
select is(
  (select count(*) from public.media), 3::bigint,
  'non-admin delete removed no media'
);
select is(
  (select count(*) from public.page_sections), 2::bigint,
  'non-admin delete removed no sections'
);

-- Admin
select tests.authenticate_as(:'a');
select is((select count(*) from public.page_sections), 2::bigint, 'admin sees published and draft sections');
select lives_ok(
  $q$insert into public.page_sections (page, key, heading) values ('about', 'story', 'New')$q$,
  'admin inserts a section'
);
select lives_ok(
  $q$update public.page_sections set heading = 'Admin edit' where key = 'story'$q$,
  'admin updates a section'
);
select is(
  (select heading from public.page_sections where key = 'story'), 'Admin edit',
  'admin update took effect'
);
select lives_ok(
  $q$delete from public.page_sections where key = 'story'$q$,
  'admin deletes a section'
);
select is(
  (select count(*) from public.page_sections where key = 'story'), 0::bigint,
  'admin delete took effect'
);
select lives_ok(
  $q$insert into public.media (id, storage_base_path, alt_text, width, height, variants)
     values ('00000000-0000-0000-0000-0000000000a4', '2026/new-dddddd', 'New photo', 10, 10, '{}'::jsonb)$q$,
  'admin inserts media'
);
select lives_ok(
  $q$update public.media set alt_text = 'Admin alt' where id = '00000000-0000-0000-0000-0000000000a4'$q$,
  'admin updates media'
);
select is(
  (select alt_text from public.media where id = '00000000-0000-0000-0000-0000000000a4'), 'Admin alt',
  'admin media update took effect'
);
select lives_ok(
  $q$delete from public.media where id = '00000000-0000-0000-0000-0000000000a4'$q$,
  'admin deletes media'
);
select lives_ok(
  $q$update public.site_settings set tagline = 'Admin tagline'$q$,
  'admin updates site_settings'
);
select is(
  (select tagline from public.site_settings), 'Admin tagline',
  'admin site_settings update took effect'
);
select throws_ok(
  $q$delete from public.site_settings$q$,
  '42501', null, 'admin cannot delete site_settings (no grant)'
);
select tests.reset_role();

select * from finish();
rollback;
