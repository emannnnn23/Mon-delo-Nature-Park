begin;
select plan(253);

-- Server-side access matrix: the one readable summary of who may do what.
-- Each row of the matrix below is one statement against one object, and the
-- outcome it must have for each actor:
--   anon        the anon key, no user
--   non_admin   a signed-in user with a live session and no admin profile
--   dead_admin  an admin whose session was signed out (auth.sessions row
--               deleted) while the access token is still unexpired
--   live_admin  the same admin on a live session (the positive control that
--               proves every statement targets a real row)
-- A number is how many rows the statement must return or change. 'denied'
-- must raise 42501 (no privilege, or a row-level security violation).
-- 'readonly' must raise 55000 (the view is not updatable).
-- Updates and deletes that RLS filters out return 0 rows without raising.
-- The per-table tests (00010-00070) cover the details; this file catches any
-- policy or grant regression across all of them in one place. Every public
-- table and view must appear here (checked at the end).

-- Fixtures (as postgres) ---------------------------------------------------------
select tests.create_user('matrix-admin@example.test', true) as a \gset
select tests.create_user('matrix-user@example.test') as b \gset
select tests.create_session(:'a') as live \gset
select tests.create_session(:'a') as dead \gset

-- The storage schema blocks raw deletes unless the API flag is set.
select set_config('storage.allow_delete_query', 'true', true);

insert into public.media (id, storage_base_path, alt_text, width, height, variants)
values
  ('00000000-0000-0000-0000-000000008601', '2026/matrix-aaaaaa', 'Matrix photo', 10, 10, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000008611', '2026/matrix-bbbbbb', 'Matrix spare', 10, 10, '{}'::jsonb);
insert into public.page_sections (id, page, key, media_id, is_published)
values ('00000000-0000-0000-0000-000000008602', 'visit', 'matrix-draft',
        '00000000-0000-0000-0000-000000008601', false);
insert into public.attractions (id, kind, slug, name, summary, is_published)
values ('00000000-0000-0000-0000-000000008603', 'attraction', 'matrix-draft', 'Matrix Draft',
        'Summary', false);
insert into public.attraction_images (id, attraction_id, media_id)
values ('00000000-0000-0000-0000-000000008604', '00000000-0000-0000-0000-000000008603',
        '00000000-0000-0000-0000-000000008601');
insert into public.gallery_categories (id, name, slug, is_published)
values ('00000000-0000-0000-0000-000000008605', 'Matrix Draft', 'matrix-draft', false);
insert into public.gallery_images (id, media_id, category_id, is_published)
values ('00000000-0000-0000-0000-000000008606', '00000000-0000-0000-0000-000000008601',
        '00000000-0000-0000-0000-000000008605', false);
insert into public.testimonials (id, author_name, quote, source, is_published)
values ('00000000-0000-0000-0000-000000008607', 'Matrix Author', 'A long enough quote', 'direct',
        false);
insert into public.announcements (id, title, is_published)
values ('00000000-0000-0000-0000-000000008608', 'Matrix announcement', false);
insert into public.faqs (id, question, answer, is_published)
values ('00000000-0000-0000-0000-000000008609', 'Matrix question?', 'Matrix answer', false);
insert into public.contact_messages (id, full_name, email, subject, message)
values ('00000000-0000-0000-0000-00000000860a', 'Matrix Visitor', 'matrix@example.test',
        'Matrix', 'A message for the access matrix.');
insert into storage.objects (bucket_id, name) values ('media', 'matrix.webp');

-- The matrix ---------------------------------------------------------------------
-- Rows run in ord order. For the live admin the deletes run children first, so
-- media and the parents are free to delete when their turn comes.
create temporary table matrix (
  ord integer primary key,
  object text not null,
  op text not null,
  statement text not null,
  anon text not null,
  non_admin text not null,
  dead_admin text not null,
  live_admin text not null
) on commit drop;

insert into matrix values
  -- public.recent_content_updates (admin dashboard view)
  (101, 'public.recent_content_updates', 'select',
   $q$select 1 from public.recent_content_updates
      where id = '00000000-0000-0000-0000-000000008602'$q$,
   'denied', '0', '0', '1'),
  (102, 'public.recent_content_updates', 'insert',
   $q$insert into public.recent_content_updates (source, id, title, updated_at)
      values ('faqs', gen_random_uuid(), 'x', now())$q$,
   'readonly', 'readonly', 'readonly', 'readonly'),
  (103, 'public.recent_content_updates', 'update',
   $q$update public.recent_content_updates set title = 'x'$q$,
   'readonly', 'readonly', 'readonly', 'readonly'),
  (104, 'public.recent_content_updates', 'delete',
   $q$delete from public.recent_content_updates$q$,
   'readonly', 'readonly', 'readonly', 'readonly'),

  -- public.profiles: own row only, never written through the API. A signed-out
  -- admin still reads their own row (profiles_select_own checks auth.uid(),
  -- not is_admin()); it grants nothing.
  (201, 'public.profiles', 'select',
   format($q$select 1 from public.profiles where id = %L$q$, :'a'),
   'denied', '0', '1', '1'),
  (202, 'public.profiles', 'insert',
   format($q$insert into public.profiles (id, role) values (%L, 'admin')$q$, :'b'),
   'denied', 'denied', 'denied', 'denied'),
  (203, 'public.profiles', 'update',
   format($q$update public.profiles set full_name = 'Matrix' where id = %L$q$, :'a'),
   'denied', 'denied', 'denied', 'denied'),
  (204, 'public.profiles', 'delete',
   format($q$delete from public.profiles where id = %L$q$, :'a'),
   'denied', 'denied', 'denied', 'denied'),

  -- public.site_settings: public read, one row, admin update only
  (301, 'public.site_settings', 'select',
   $q$select 1 from public.site_settings$q$,
   '1', '1', '1', '1'),
  (302, 'public.site_settings', 'insert',
   $q$insert into public.site_settings (park_name, address_line) values ('x', 'y')$q$,
   'denied', 'denied', 'denied', 'denied'),
  (303, 'public.site_settings', 'update',
   $q$update public.site_settings set tagline = 'Matrix'$q$,
   'denied', '0', '0', '1'),
  (304, 'public.site_settings', 'delete',
   $q$delete from public.site_settings$q$,
   'denied', 'denied', 'denied', 'denied'),

  -- public.contact_messages: written only through submit_contact_message
  (401, 'public.contact_messages', 'select',
   $q$select 1 from public.contact_messages where id = '00000000-0000-0000-0000-00000000860a'$q$,
   'denied', '0', '0', '1'),
  (402, 'public.contact_messages', 'insert',
   $q$insert into public.contact_messages (full_name, email, subject, message)
      values ('Direct Insert', 'direct@example.test', 'Direct', 'Inserted without the RPC.')$q$,
   'denied', 'denied', 'denied', 'denied'),
  (403, 'public.contact_messages', 'update',
   $q$update public.contact_messages set status = 'read'
      where id = '00000000-0000-0000-0000-00000000860a'$q$,
   'denied', '0', '0', '1'),
  (404, 'public.contact_messages', 'delete',
   $q$delete from public.contact_messages where id = '00000000-0000-0000-0000-00000000860a'$q$,
   'denied', '0', '0', '1'),

  -- public.testimonials
  (501, 'public.testimonials', 'select',
   $q$select 1 from public.testimonials where id = '00000000-0000-0000-0000-000000008607'$q$,
   '0', '0', '0', '1'),
  (502, 'public.testimonials', 'insert',
   $q$insert into public.testimonials (author_name, quote, source)
      values ('Matrix New', 'Another long enough quote', 'direct')$q$,
   'denied', 'denied', 'denied', '1'),
  (503, 'public.testimonials', 'update',
   $q$update public.testimonials set sort_order = 7
      where id = '00000000-0000-0000-0000-000000008607'$q$,
   'denied', '0', '0', '1'),
  (504, 'public.testimonials', 'delete',
   $q$delete from public.testimonials where id = '00000000-0000-0000-0000-000000008607'$q$,
   'denied', '0', '0', '1'),

  -- public.announcements
  (601, 'public.announcements', 'select',
   $q$select 1 from public.announcements where id = '00000000-0000-0000-0000-000000008608'$q$,
   '0', '0', '0', '1'),
  (602, 'public.announcements', 'insert',
   $q$insert into public.announcements (title) values ('Matrix new')$q$,
   'denied', 'denied', 'denied', '1'),
  (603, 'public.announcements', 'update',
   $q$update public.announcements set title = 'Matrix edit'
      where id = '00000000-0000-0000-0000-000000008608'$q$,
   'denied', '0', '0', '1'),
  (604, 'public.announcements', 'delete',
   $q$delete from public.announcements where id = '00000000-0000-0000-0000-000000008608'$q$,
   'denied', '0', '0', '1'),

  -- public.faqs
  (701, 'public.faqs', 'select',
   $q$select 1 from public.faqs where id = '00000000-0000-0000-0000-000000008609'$q$,
   '0', '0', '0', '1'),
  (702, 'public.faqs', 'insert',
   $q$insert into public.faqs (question, answer) values ('Matrix new?', 'Matrix answer')$q$,
   'denied', 'denied', 'denied', '1'),
  (703, 'public.faqs', 'update',
   $q$update public.faqs set sort_order = 7 where id = '00000000-0000-0000-0000-000000008609'$q$,
   'denied', '0', '0', '1'),
  (704, 'public.faqs', 'delete',
   $q$delete from public.faqs where id = '00000000-0000-0000-0000-000000008609'$q$,
   'denied', '0', '0', '1'),

  -- public.attraction_images (visible through a published parent; parent is a draft)
  (801, 'public.attraction_images', 'select',
   $q$select 1 from public.attraction_images where id = '00000000-0000-0000-0000-000000008604'$q$,
   '0', '0', '0', '1'),
  (802, 'public.attraction_images', 'insert',
   $q$insert into public.attraction_images (attraction_id, media_id)
      values ('00000000-0000-0000-0000-000000008603', '00000000-0000-0000-0000-000000008611')$q$,
   'denied', 'denied', 'denied', '1'),
  (803, 'public.attraction_images', 'update',
   $q$update public.attraction_images set caption = 'Matrix edit'
      where id = '00000000-0000-0000-0000-000000008604'$q$,
   'denied', '0', '0', '1'),
  (804, 'public.attraction_images', 'delete',
   $q$delete from public.attraction_images where id = '00000000-0000-0000-0000-000000008604'$q$,
   'denied', '0', '0', '1'),

  -- public.gallery_images
  (901, 'public.gallery_images', 'select',
   $q$select 1 from public.gallery_images where id = '00000000-0000-0000-0000-000000008606'$q$,
   '0', '0', '0', '1'),
  (902, 'public.gallery_images', 'insert',
   $q$insert into public.gallery_images (media_id) values ('00000000-0000-0000-0000-000000008611')$q$,
   'denied', 'denied', 'denied', '1'),
  (903, 'public.gallery_images', 'update',
   $q$update public.gallery_images set sort_order = 7
      where id = '00000000-0000-0000-0000-000000008606'$q$,
   'denied', '0', '0', '1'),
  (904, 'public.gallery_images', 'delete',
   $q$delete from public.gallery_images where id = '00000000-0000-0000-0000-000000008606'$q$,
   'denied', '0', '0', '1'),

  -- public.page_sections
  (1001, 'public.page_sections', 'select',
   $q$select 1 from public.page_sections where id = '00000000-0000-0000-0000-000000008602'$q$,
   '0', '0', '0', '1'),
  (1002, 'public.page_sections', 'insert',
   $q$insert into public.page_sections (page, key) values ('visit', 'matrix-new')$q$,
   'denied', 'denied', 'denied', '1'),
  (1003, 'public.page_sections', 'update',
   $q$update public.page_sections set sort_order = 7
      where id = '00000000-0000-0000-0000-000000008602'$q$,
   'denied', '0', '0', '1'),
  (1004, 'public.page_sections', 'delete',
   $q$delete from public.page_sections where id = '00000000-0000-0000-0000-000000008602'$q$,
   'denied', '0', '0', '1'),

  -- public.attractions
  (1101, 'public.attractions', 'select',
   $q$select 1 from public.attractions where id = '00000000-0000-0000-0000-000000008603'$q$,
   '0', '0', '0', '1'),
  (1102, 'public.attractions', 'insert',
   $q$insert into public.attractions (kind, slug, name, summary)
      values ('attraction', 'matrix-new', 'Matrix New', 'Summary')$q$,
   'denied', 'denied', 'denied', '1'),
  (1103, 'public.attractions', 'update',
   $q$update public.attractions set sort_order = 7
      where id = '00000000-0000-0000-0000-000000008603'$q$,
   'denied', '0', '0', '1'),
  (1104, 'public.attractions', 'delete',
   $q$delete from public.attractions where id = '00000000-0000-0000-0000-000000008603'$q$,
   'denied', '0', '0', '1'),

  -- public.gallery_categories
  (1201, 'public.gallery_categories', 'select',
   $q$select 1 from public.gallery_categories where id = '00000000-0000-0000-0000-000000008605'$q$,
   '0', '0', '0', '1'),
  (1202, 'public.gallery_categories', 'insert',
   $q$insert into public.gallery_categories (name, slug) values ('Matrix New', 'matrix-new')$q$,
   'denied', 'denied', 'denied', '1'),
  (1203, 'public.gallery_categories', 'update',
   $q$update public.gallery_categories set sort_order = 7
      where id = '00000000-0000-0000-0000-000000008605'$q$,
   'denied', '0', '0', '1'),
  (1204, 'public.gallery_categories', 'delete',
   $q$delete from public.gallery_categories where id = '00000000-0000-0000-0000-000000008605'$q$,
   'denied', '0', '0', '1'),

  -- public.media: public read (alt text and paths), admin writes
  (1301, 'public.media', 'select',
   $q$select 1 from public.media where id = '00000000-0000-0000-0000-000000008601'$q$,
   '1', '1', '1', '1'),
  (1302, 'public.media', 'insert',
   $q$insert into public.media (storage_base_path, alt_text, width, height, variants)
      values ('2026/matrix-new', 'Matrix new', 10, 10, '{}'::jsonb)$q$,
   'denied', 'denied', 'denied', '1'),
  (1303, 'public.media', 'update',
   $q$update public.media set alt_text = 'Matrix edit'
      where id = '00000000-0000-0000-0000-000000008601'$q$,
   'denied', '0', '0', '1'),
  (1304, 'public.media', 'delete',
   $q$delete from public.media where id = '00000000-0000-0000-0000-000000008601'$q$,
   'denied', '0', '0', '1'),

  -- storage.objects in the media bucket. Supabase grants anon and
  -- authenticated table privileges here; the media_objects_* policies are the
  -- gate, so filtered writes return 0 instead of raising.
  (1401, 'storage.objects', 'select',
   $q$select 1 from storage.objects where bucket_id = 'media' and name = 'matrix.webp'$q$,
   '0', '0', '0', '1'),
  (1402, 'storage.objects', 'insert',
   $q$insert into storage.objects (bucket_id, name) values ('media', 'inserted.webp')$q$,
   'denied', 'denied', 'denied', '1'),
  (1403, 'storage.objects', 'update',
   $q$update storage.objects set name = 'matrix-moved.webp'
      where bucket_id = 'media' and name = 'matrix.webp'$q$,
   '0', '0', '0', '1'),
  (1404, 'storage.objects', 'delete',
   $q$delete from storage.objects where bucket_id = 'media' and name like 'matrix%'$q$,
   '0', '0', '0', '1'),

  -- storage.buckets: no policies at all, so nobody manages buckets through the
  -- API, admins included (the media bucket is created by a migration).
  (1501, 'storage.buckets', 'select',
   $q$select 1 from storage.buckets where id = 'media'$q$,
   '0', '0', '0', '0'),
  (1502, 'storage.buckets', 'insert',
   $q$insert into storage.buckets (id, name) values ('matrix', 'matrix')$q$,
   'denied', 'denied', 'denied', 'denied'),
  (1503, 'storage.buckets', 'update',
   $q$update storage.buckets set public = false where id = 'media'$q$,
   '0', '0', '0', '0'),
  (1504, 'storage.buckets', 'delete',
   $q$delete from storage.buckets where id = 'media'$q$,
   '0', '0', '0', '0');

grant select on matrix to anon, authenticated;

-- Runs every matrix row for one actor, as the current role.
create function pg_temp.run_matrix(actor text)
returns setof text
language plpgsql
as $$
declare
  m record;
  expected text;
  label text;
begin
  for m in select * from matrix order by ord loop
    expected := case actor
      when 'anon' then m.anon
      when 'non_admin' then m.non_admin
      when 'dead_admin' then m.dead_admin
      when 'live_admin' then m.live_admin
    end;
    label := format('%s: %s on %s', actor, m.op, m.object);
    if expected = 'denied' then
      return next throws_ok(m.statement, '42501', null, label || ' is denied');
    elsif expected = 'readonly' then
      return next throws_ok(m.statement, '55000', null, label || ' is not possible (read-only view)');
    else
      return next is(tests.row_count(m.statement), expected::bigint,
                     format('%s affects %s row(s)', label, expected));
    end if;
  end loop;
end;
$$;

grant execute on function pg_temp.run_matrix(text) to anon, authenticated;

-- The matrix must cover every public table and view, with all four operations.
select is(
  (
    select coalesce(array_agg(c.relname::text order by c.relname), array[]::text[])
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'v', 'm')
       and 'public.' || c.relname not in (select object from matrix)
  ),
  array[]::text[],
  'every public table and view has rows in the access matrix'
);
select is(
  (select count(*) from (
     select object from matrix group by object
     having array_agg(op order by op) <> array['delete', 'insert', 'select', 'update']
   ) bad),
  0::bigint,
  'every object in the matrix has exactly select, insert, update and delete'
);

-- anon ---------------------------------------------------------------------------
select tests.as_anon();
select pg_temp.run_matrix('anon');
select is(public.is_admin(), false, 'anon: is_admin() is false');
select is(
  public.submit_contact_message('Matrix Bot', 'bot@example.test', null, 'Hi', 'Honeypot filled in.',
                                'bot', 5000),
  'ok', 'anon: can execute submit_contact_message'
);
select tests.reset_role();

-- non_admin ----------------------------------------------------------------------
select tests.authenticate_as(:'b');
select pg_temp.run_matrix('non_admin');
select is(public.is_admin(), false, 'non_admin: is_admin() is false');
select is(
  public.submit_contact_message('Matrix Bot', 'bot@example.test', null, 'Hi', 'Honeypot filled in.',
                                'bot', 5000),
  'ok', 'non_admin: can execute submit_contact_message'
);
select tests.reset_role();

-- dead_admin ---------------------------------------------------------------------
-- Sign out: Supabase Auth deletes the session row. The token still carries
-- its session_id until it expires.
delete from auth.sessions where id = :'dead';
select tests.authenticate_as_session(:'a', :'dead');
select pg_temp.run_matrix('dead_admin');
select is(public.is_admin(), false, 'dead_admin: is_admin() is false');
select is(
  public.submit_contact_message('Matrix Bot', 'bot@example.test', null, 'Hi', 'Honeypot filled in.',
                                'bot', 5000),
  'ok', 'dead_admin: can execute submit_contact_message'
);
select tests.reset_role();

-- Nothing the three actors above did changed any fixture.
select is(
  (select count(*) from public.media
    where id = '00000000-0000-0000-0000-000000008601' and alt_text = 'Matrix photo')
  + (select count(*) from public.page_sections
      where id = '00000000-0000-0000-0000-000000008602' and sort_order = 0)
  + (select count(*) from public.attractions
      where id = '00000000-0000-0000-0000-000000008603' and sort_order = 0)
  + (select count(*) from public.attraction_images
      where id = '00000000-0000-0000-0000-000000008604' and caption is null)
  + (select count(*) from public.gallery_categories
      where id = '00000000-0000-0000-0000-000000008605' and sort_order = 0)
  + (select count(*) from public.gallery_images
      where id = '00000000-0000-0000-0000-000000008606' and sort_order = 0)
  + (select count(*) from public.testimonials
      where id = '00000000-0000-0000-0000-000000008607' and sort_order = 0)
  + (select count(*) from public.announcements
      where id = '00000000-0000-0000-0000-000000008608' and title = 'Matrix announcement')
  + (select count(*) from public.faqs
      where id = '00000000-0000-0000-0000-000000008609' and sort_order = 0)
  + (select count(*) from public.contact_messages
      where id = '00000000-0000-0000-0000-00000000860a' and status = 'new')
  + (select count(*) from public.site_settings where tagline is distinct from 'Matrix')
  + (select count(*) from public.profiles where id = :'a' and full_name = 'Test Admin')
  + (select count(*) from storage.objects where bucket_id = 'media' and name = 'matrix.webp')
  + (select count(*) from storage.buckets where id = 'media' and public),
  14::bigint,
  'anon, non_admin and dead_admin changed no fixture'
);

-- live_admin (positive control) -----------------------------------------------------
select tests.authenticate_as_session(:'a', :'live');
select pg_temp.run_matrix('live_admin');
select is(public.is_admin(), true, 'live_admin: is_admin() is true');
select is(
  public.submit_contact_message('Matrix Bot', 'bot@example.test', null, 'Hi', 'Honeypot filled in.',
                                'bot', 5000),
  'ok', 'live_admin: can execute submit_contact_message'
);
select tests.reset_role();

-- Functions: exactly two are callable through the API ------------------------------
select is(
  (select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('anon', p.oid, 'execute')),
  array['is_admin()', 'submit_contact_message(text,text,text,text,text,text,integer)'],
  'anon can execute exactly is_admin and submit_contact_message in public'
);
select is(
  (select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('authenticated', p.oid, 'execute')),
  array['is_admin()', 'submit_contact_message(text,text,text,text,text,text,integer)'],
  'authenticated can execute exactly is_admin and submit_contact_message in public'
);

select * from finish();
rollback;
