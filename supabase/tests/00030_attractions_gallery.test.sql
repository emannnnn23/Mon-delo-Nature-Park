begin;
select plan(68);

select policies_are(
  'public', 'attractions',
  array[
    'attractions_select_published', 'attractions_insert_admin',
    'attractions_update_admin', 'attractions_delete_admin'
  ],
  'attractions has exactly one policy per operation'
);
select policies_are(
  'public', 'attraction_images',
  array[
    'attraction_images_select_published', 'attraction_images_insert_admin',
    'attraction_images_update_admin', 'attraction_images_delete_admin'
  ],
  'attraction_images has exactly one policy per operation'
);
select policies_are(
  'public', 'gallery_categories',
  array[
    'gallery_categories_select_published', 'gallery_categories_insert_admin',
    'gallery_categories_update_admin', 'gallery_categories_delete_admin'
  ],
  'gallery_categories has exactly one policy per operation'
);
select policies_are(
  'public', 'gallery_images',
  array[
    'gallery_images_select_published', 'gallery_images_insert_admin',
    'gallery_images_update_admin', 'gallery_images_delete_admin'
  ],
  'gallery_images has exactly one policy per operation'
);

select tests.create_user('admin-a@example.test', true) as a \gset
select tests.create_user('user-b@example.test') as b \gset

-- Seed as postgres (before switching roles).
-- updated_at is set explicitly to an old value on insert; the update trigger
-- only fires on update, so this gives a baseline that works inside one transaction.
insert into public.media (id, storage_base_path, alt_text, width, height, variants, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '2026/cov-aaaaaa', 'Cover photo', 1600, 900,
   '{"480": "2026/cov-aaaaaa-480.webp"}'::jsonb, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000a2', '2026/img-bbbbbb', 'Detail photo', 1600, 900,
   '{"480": "2026/img-bbbbbb-480.webp"}'::jsonb, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000a3', '2026/gal-cccccc', 'Gallery photo', 1600, 900,
   '{"480": "2026/gal-cccccc-480.webp"}'::jsonb, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000a4', '2026/free-dddddd', 'Unreferenced photo', 800, 600,
   '{"480": "2026/free-dddddd-480.webp"}'::jsonb, '2000-01-01 00:00:00+00');

insert into public.attractions
  (id, kind, slug, name, summary, icon, cover_media_id, is_published, updated_at)
values
  ('00000000-0000-0000-0000-0000000000d1', 'attraction', 'published-spot', 'Published Spot',
   'A short summary', 'leaf', '00000000-0000-0000-0000-0000000000a1', true,
   '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000d2', 'attraction', 'draft-spot', 'Draft Spot',
   'Another summary', null, null, false, '2000-01-01 00:00:00+00');

insert into public.attraction_images (id, attraction_id, media_id, caption, sort_order, updated_at)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000000000a2', 'Pub one', 1, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000000000a3', 'Pub two', 2, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d2',
   '00000000-0000-0000-0000-0000000000a2', 'Draft one', 1, '2000-01-01 00:00:00+00');

insert into public.gallery_categories (id, name, slug, is_published, updated_at)
values
  ('00000000-0000-0000-0000-0000000000f1', 'Gardens', 'gardens', true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000f2', 'Hidden', 'hidden', false, '2000-01-01 00:00:00+00');

insert into public.gallery_images (id, media_id, category_id, caption, is_published, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-0000000000f1', 'Public', true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000f1', 'Draft', false, '2000-01-01 00:00:00+00');

-- Constraints (as postgres)
select throws_ok(
  $q$insert into public.attractions (kind, slug, name) values ('attraction', 'Bad Slug', 'x')$q$,
  '23514', null, 'attraction slug must be lowercase kebab-case'
);
select throws_ok(
  $q$insert into public.attractions (kind, slug, name, icon)
     values ('attraction', 'rocket-spot', 'x', 'rocket')$q$,
  '23514', null, 'icon outside the fixed Lucide list is rejected'
);
select throws_ok(
  format(
    $q$insert into public.attractions (kind, slug, name, summary)
       values ('attraction', 'long-summary', 'x', %L)$q$,
    repeat('a', 161)
  ),
  '23514', null, 'a 161-character summary is rejected'
);
select lives_ok(
  format(
    $q$insert into public.attractions (kind, slug, name, summary)
       values ('attraction', 'max-summary', 'x', %L)$q$,
    repeat('a', 160)
  ),
  'a 160-character summary is accepted'
);
select throws_ok(
  $q$insert into public.attractions (kind, slug, name) values ('place', 'odd-kind', 'x')$q$,
  '23514', null, 'unknown kind is rejected'
);
select throws_ok(
  $q$insert into public.attractions (kind, slug, name) values ('experience', 'published-spot', 'x')$q$,
  '23505', null, 'duplicate attraction slug is rejected'
);
select throws_ok(
  $q$insert into public.gallery_categories (name, slug) values ('x', 'Bad Slug')$q$,
  '23514', null, 'gallery category slug must be lowercase kebab-case'
);
select throws_ok(
  $q$insert into public.gallery_categories (name, slug) values ('x', 'gardens')$q$,
  '23505', null, 'duplicate gallery category slug is rejected'
);
select throws_ok(
  $q$delete from public.media where id = '00000000-0000-0000-0000-0000000000a1'$q$,
  '23503', null, 'media used as an attraction cover cannot be deleted'
);
select throws_ok(
  $q$delete from public.media where id = '00000000-0000-0000-0000-0000000000a2'$q$,
  '23503', null, 'media used by an attraction image cannot be deleted'
);
select throws_ok(
  $q$delete from public.media where id = '00000000-0000-0000-0000-0000000000a3'$q$,
  '23503', null, 'media used by a gallery image cannot be deleted'
);
select throws_ok(
  $q$insert into public.attraction_images (attraction_id, media_id)
     values ('00000000-0000-0000-0000-0000000000d1', null)$q$,
  '23502', null, 'attraction image requires media'
);
select throws_ok(
  $q$insert into public.gallery_images (media_id) values (null)$q$,
  '23502', null, 'gallery image requires media'
);

-- updated_at maintenance
update public.attractions set name = 'Published Spot, edited'
  where id = '00000000-0000-0000-0000-0000000000d1';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.attractions
   where id = '00000000-0000-0000-0000-0000000000d1'),
  'attractions.updated_at changes on update'
);
update public.attraction_images set caption = 'Edited'
  where id = '00000000-0000-0000-0000-0000000000e1';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.attraction_images
   where id = '00000000-0000-0000-0000-0000000000e1'),
  'attraction_images.updated_at changes on update'
);
update public.gallery_categories set name = 'Gardens, edited'
  where id = '00000000-0000-0000-0000-0000000000f1';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.gallery_categories
   where id = '00000000-0000-0000-0000-0000000000f1'),
  'gallery_categories.updated_at changes on update'
);
update public.gallery_images set caption = 'Public, edited'
  where id = '00000000-0000-0000-0000-000000000101';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.gallery_images
   where id = '00000000-0000-0000-0000-000000000101'),
  'gallery_images.updated_at changes on update'
);

-- Remove the rows the constraint checks created, so counts below are exact.
delete from public.attractions where slug = 'max-summary';

-- Anonymous
select tests.as_anon();
select is(
  (select count(*) from public.attractions), 1::bigint,
  'anon sees only published attractions'
);
select is(
  (select count(*) from public.attractions where slug = 'draft-spot'), 0::bigint,
  'anon cannot see the unpublished attraction'
);
select is(
  (select count(*) from public.attraction_images
   where attraction_id = '00000000-0000-0000-0000-0000000000d1'),
  2::bigint,
  'anon sees images of a published attraction'
);
select is(
  (select count(*) from public.attraction_images
   where attraction_id = '00000000-0000-0000-0000-0000000000d2'),
  0::bigint,
  'anon sees no images of an unpublished attraction'
);
select is(
  (select count(*) from public.gallery_categories), 1::bigint,
  'anon sees only published gallery categories'
);
select is(
  (select count(*) from public.gallery_images), 1::bigint,
  'anon sees only published gallery images'
);
select throws_ok(
  $q$insert into public.attractions (kind, slug, name) values ('attraction', 'anon-spot', 'x')$q$,
  '42501', null, 'anon cannot insert attractions'
);
select throws_ok(
  $q$update public.attractions set name = 'hacked'$q$,
  '42501', null, 'anon cannot update attractions'
);
select throws_ok(
  $q$delete from public.attractions$q$,
  '42501', null, 'anon cannot delete attractions'
);
select throws_ok(
  $q$insert into public.attraction_images (attraction_id, media_id)
     values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a4')$q$,
  '42501', null, 'anon cannot insert attraction_images'
);
select throws_ok(
  $q$insert into public.gallery_categories (name, slug) values ('x', 'anon-cat')$q$,
  '42501', null, 'anon cannot insert gallery_categories'
);
select throws_ok(
  $q$insert into public.gallery_images (media_id) values ('00000000-0000-0000-0000-0000000000a4')$q$,
  '42501', null, 'anon cannot insert gallery_images'
);
select throws_ok(
  $q$delete from public.gallery_images$q$,
  '42501', null, 'anon cannot delete gallery_images'
);
select tests.reset_role();

-- Authenticated non-admin
select tests.authenticate_as(:'b');
select is(
  (select count(*) from public.attractions), 1::bigint,
  'non-admin sees only published attractions'
);
select is(
  (select count(*) from public.attraction_images), 2::bigint,
  'non-admin sees only images of published attractions'
);
select is(
  (select count(*) from public.gallery_categories), 1::bigint,
  'non-admin sees only published gallery categories'
);
select is(
  (select count(*) from public.gallery_images), 1::bigint,
  'non-admin sees only published gallery images'
);
select throws_ok(
  $q$insert into public.attractions (kind, slug, name) values ('attraction', 'user-spot', 'x')$q$,
  '42501', null, 'non-admin cannot insert attractions'
);
select throws_ok(
  $q$insert into public.attraction_images (attraction_id, media_id)
     values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a4')$q$,
  '42501', null, 'non-admin cannot insert attraction_images'
);
select throws_ok(
  $q$insert into public.gallery_categories (name, slug) values ('x', 'user-cat')$q$,
  '42501', null, 'non-admin cannot insert gallery_categories'
);
select throws_ok(
  $q$insert into public.gallery_images (media_id) values ('00000000-0000-0000-0000-0000000000a4')$q$,
  '42501', null, 'non-admin cannot insert gallery_images'
);
-- Updates and deletes filtered out by RLS affect 0 rows without raising.
update public.attractions set name = 'hacked';
update public.attraction_images set caption = 'hacked';
update public.gallery_categories set name = 'hacked';
update public.gallery_images set caption = 'hacked';
delete from public.attractions;
delete from public.attraction_images;
delete from public.gallery_categories;
delete from public.gallery_images;
select tests.reset_role();

select is(
  (select count(*) from public.attractions where name = 'hacked')
  + (select count(*) from public.attraction_images where caption = 'hacked')
  + (select count(*) from public.gallery_categories where name = 'hacked')
  + (select count(*) from public.gallery_images where caption = 'hacked'),
  0::bigint,
  'non-admin updates changed nothing'
);
select is((select count(*) from public.attractions), 2::bigint, 'non-admin delete removed no attractions');
select is((select count(*) from public.attraction_images), 3::bigint, 'non-admin delete removed no attraction images');
select is((select count(*) from public.gallery_categories), 2::bigint, 'non-admin delete removed no categories');
select is((select count(*) from public.gallery_images), 2::bigint, 'non-admin delete removed no gallery images');

-- Admin
select tests.authenticate_as(:'a');
select is((select count(*) from public.attractions), 2::bigint, 'admin sees published and draft attractions');
select is((select count(*) from public.attraction_images), 3::bigint, 'admin sees images of every attraction');
select is((select count(*) from public.gallery_categories), 2::bigint, 'admin sees every category');
select is((select count(*) from public.gallery_images), 2::bigint, 'admin sees every gallery image');

select lives_ok(
  $q$insert into public.attractions (id, kind, slug, name, icon, is_published)
     values ('00000000-0000-0000-0000-0000000000d3', 'experience', 'dining', 'Dining', 'utensils', true)$q$,
  'admin inserts an attraction'
);
select lives_ok(
  $q$update public.attractions set name = 'Dining, edited'
     where id = '00000000-0000-0000-0000-0000000000d3'$q$,
  'admin updates an attraction'
);
select is(
  (select name from public.attractions where id = '00000000-0000-0000-0000-0000000000d3'),
  'Dining, edited',
  'admin attraction update took effect'
);
select lives_ok(
  $q$insert into public.attraction_images (id, attraction_id, media_id)
     values ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000d3',
             '00000000-0000-0000-0000-0000000000a4')$q$,
  'admin inserts an attraction image'
);
select lives_ok(
  $q$update public.attraction_images set caption = 'Admin caption'
     where id = '00000000-0000-0000-0000-0000000000e4'$q$,
  'admin updates an attraction image'
);
select is(
  (select caption from public.attraction_images where id = '00000000-0000-0000-0000-0000000000e4'),
  'Admin caption',
  'admin attraction image update took effect'
);
select lives_ok(
  $q$delete from public.attractions where id = '00000000-0000-0000-0000-0000000000d3'$q$,
  'admin deletes an attraction'
);
select is(
  (select count(*) from public.attraction_images
   where attraction_id = '00000000-0000-0000-0000-0000000000d3'),
  0::bigint,
  'deleting an attraction removes its images'
);

select lives_ok(
  $q$insert into public.gallery_categories (id, name, slug)
     values ('00000000-0000-0000-0000-0000000000f3', 'Pool', 'pool')$q$,
  'admin inserts a gallery category'
);
select lives_ok(
  $q$update public.gallery_categories set name = 'Pool, edited'
     where id = '00000000-0000-0000-0000-0000000000f3'$q$,
  'admin updates a gallery category'
);
select is(
  (select name from public.gallery_categories where id = '00000000-0000-0000-0000-0000000000f3'),
  'Pool, edited',
  'admin category update took effect'
);
select lives_ok(
  $q$insert into public.gallery_images (id, media_id, category_id)
     values ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-0000000000a4',
             '00000000-0000-0000-0000-0000000000f3')$q$,
  'admin inserts a gallery image'
);
select lives_ok(
  $q$update public.gallery_images set caption = 'Admin caption'
     where id = '00000000-0000-0000-0000-000000000103'$q$,
  'admin updates a gallery image'
);
select is(
  (select caption from public.gallery_images where id = '00000000-0000-0000-0000-000000000103'),
  'Admin caption',
  'admin gallery image update took effect'
);
select lives_ok(
  $q$delete from public.gallery_categories where id = '00000000-0000-0000-0000-0000000000f3'$q$,
  'admin deletes a gallery category'
);
select is(
  (select count(*) from public.gallery_images
   where id = '00000000-0000-0000-0000-000000000103' and category_id is null),
  1::bigint,
  'deleting a category leaves its images with a null category'
);
select lives_ok(
  $q$delete from public.gallery_images where id = '00000000-0000-0000-0000-000000000103'$q$,
  'admin deletes a gallery image'
);
select tests.reset_role();

select * from finish();
rollback;
