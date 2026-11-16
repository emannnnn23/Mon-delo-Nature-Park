begin;
select plan(21);

select tests.create_user('admin-a@example.test', true) as a \gset
select tests.create_user('user-b@example.test') as b \gset

select ok(
  not has_table_privilege('anon', 'public.recent_content_updates', 'select'),
  'anon holds no select on the view'
);
select ok(
  has_table_privilege('authenticated', 'public.recent_content_updates', 'select'),
  'authenticated holds select on the view'
);
select ok(
  not has_table_privilege('authenticated', 'public.recent_content_updates', 'insert, update, delete'),
  'authenticated holds no write privilege on the view'
);

-- Seed one row per source, as postgres, with distinct explicit updated_at
-- values (oldest first). Everything is unpublished: the view is for admins.
insert into public.media (id, storage_base_path, alt_text, width, height, variants, updated_at)
values ('00000000-0000-0000-0000-0000000000b1', '2026/view-aaaaaa', 'View photo', 1600, 900,
        '{"480": "2026/view-aaaaaa-480.webp"}'::jsonb, '2000-01-01 00:00:00+00');

insert into public.page_sections (id, page, key, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000501', 'home', 'hero', false, '2020-01-01 00:00:00+00');

insert into public.attractions (id, kind, slug, name, summary, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000502', 'attraction', 'view-spot', 'View Spot', 'Summary',
        false, '2020-02-01 00:00:00+00');

insert into public.gallery_images (id, media_id, caption, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-0000000000b1', null,
        false, '2020-03-01 00:00:00+00');

insert into public.gallery_categories (id, name, slug, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000504', 'View Category', 'view-category', false,
        '2020-04-01 00:00:00+00');

insert into public.testimonials (id, author_name, quote, source, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000505', 'View Author', 'A long enough quote', 'direct',
        false, '2020-05-01 00:00:00+00');

insert into public.announcements (id, title, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000506', 'View Announcement', false,
        '2020-06-01 00:00:00+00');

insert into public.faqs (id, question, answer, is_published, updated_at)
values ('00000000-0000-0000-0000-000000000507', 'View question?', 'View answer', false,
        '2020-07-01 00:00:00+00');

insert into public.site_settings (id, park_name, updated_at)
values ('00000000-0000-0000-0000-000000000508', 'Mondelos Nature Park', '2020-08-01 00:00:00+00');

-- Anonymous: no grant at all.
select tests.as_anon();
select throws_ok(
  $q$select * from public.recent_content_updates$q$,
  '42501', null, 'anon cannot select from the view'
);
select tests.reset_role();

-- Authenticated non-admin: the view is empty.
select tests.authenticate_as(:'b');
select is(
  (select count(*) from public.recent_content_updates), 0::bigint,
  'a non-admin sees no rows in the view'
);
select tests.reset_role();

-- Admin: every branch, mapped as the dashboard expects.
select tests.authenticate_as(:'a');
select is(
  (select count(*) from public.recent_content_updates), 8::bigint,
  'admin sees one row per seeded source, drafts included'
);
select is(
  (select title from public.recent_content_updates where source = 'page_sections'),
  'home · hero', 'page_sections title is page · key'
);
select is(
  (select title from public.recent_content_updates where source = 'attractions'),
  'View Spot', 'attractions title is the name'
);
select is(
  (select title from public.recent_content_updates where source = 'gallery_images'),
  'Image', 'gallery_images title falls back to Image when there is no caption'
);
select is(
  (select title from public.recent_content_updates where source = 'gallery_categories'),
  'View Category', 'gallery_categories title is the name'
);
select is(
  (select title from public.recent_content_updates where source = 'testimonials'),
  'View Author', 'testimonials title is the author name'
);
select is(
  (select title from public.recent_content_updates where source = 'announcements'),
  'View Announcement', 'announcements title is the title'
);
select is(
  (select title from public.recent_content_updates where source = 'faqs'),
  'View question?', 'faqs title is the question'
);
select is(
  (select title from public.recent_content_updates where source = 'site_settings'),
  'Contact & settings', 'site_settings title is the fixed label'
);
select is(
  (select id from public.recent_content_updates where source = 'site_settings'),
  '00000000-0000-0000-0000-000000000508'::uuid, 'the view exposes the source row id'
);
select is(
  (select source from public.recent_content_updates limit 1),
  'site_settings', 'the first row is the most recently updated'
);
select is(
  (select array_agg(updated_at) from (select updated_at from public.recent_content_updates) v),
  (select array_agg(updated_at order by updated_at desc) from public.recent_content_updates),
  'rows come back in descending updated_at order'
);
select tests.reset_role();

-- Add more rows (as postgres) so the cap of 10 comes into play.
insert into public.attractions (kind, slug, name, summary, updated_at)
values
  ('attraction', 'cap-a', 'Cap A', 'Summary', '2020-09-01 00:00:00+00'),
  ('attraction', 'cap-b', 'Cap B', 'Summary', '2020-10-01 00:00:00+00'),
  ('attraction', 'cap-c', 'Cap C', 'Summary', '2020-11-01 00:00:00+00'),
  ('attraction', 'cap-d', 'Cap D', 'Summary', '2020-12-01 00:00:00+00');

select tests.authenticate_as(:'a');
select is(
  (select count(*) from public.recent_content_updates), 10::bigint,
  'admin sees at most 10 rows'
);
select is(
  (select title from public.recent_content_updates limit 1), 'Cap D',
  'the newest row comes first'
);
select is(
  (select count(*) from public.recent_content_updates
   where source in ('page_sections', 'attractions') and title in ('home · hero', 'View Spot')),
  0::bigint,
  'the two oldest rows fall outside the top 10'
);
select tests.reset_role();

select tests.authenticate_as(:'b');
select is(
  (select count(*) from public.recent_content_updates), 0::bigint,
  'a non-admin still sees no rows once there is more than 10'
);
select tests.reset_role();

select * from finish();
rollback;
