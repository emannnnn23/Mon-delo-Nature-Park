begin;
select plan(76);

select policies_are(
  'public', 'testimonials',
  array[
    'testimonials_select_published', 'testimonials_insert_admin',
    'testimonials_update_admin', 'testimonials_delete_admin'
  ],
  'testimonials has exactly one policy per operation'
);
select policies_are(
  'public', 'announcements',
  array[
    'announcements_select_published', 'announcements_insert_admin',
    'announcements_update_admin', 'announcements_delete_admin'
  ],
  'announcements has exactly one policy per operation'
);
select policies_are(
  'public', 'faqs',
  array[
    'faqs_select_published', 'faqs_insert_admin',
    'faqs_update_admin', 'faqs_delete_admin'
  ],
  'faqs has exactly one policy per operation'
);

select tests.create_user('admin-a@example.test', true) as a \gset
select tests.create_user('user-b@example.test') as b \gset

-- Seed as postgres. updated_at gets an old explicit baseline so the update
-- trigger can be observed inside one transaction.
insert into public.testimonials
  (id, author_name, quote, rating, source, is_published, updated_at)
values
  ('00000000-0000-0000-0000-000000000201', 'Ana Silva', 'A lovely, peaceful afternoon.', 5,
   'google', true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000202', 'Ben Costa', 'Draft quote awaiting review.', null,
   'direct', false, '2000-01-01 00:00:00+00');

insert into public.announcements
  (id, title, body, starts_at, ends_at, is_published, updated_at)
values
  ('00000000-0000-0000-0000-000000000301', 'Current notice', 'Open all week.',
   now() - interval '1 day', null, true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000302', 'Expired notice', null,
   now() - interval '3 days', now() - interval '1 day', true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000303', 'Future notice', null,
   now() + interval '1 day', now() + interval '3 days', true, '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000304', 'Draft notice', null,
   now() - interval '1 day', null, false, '2000-01-01 00:00:00+00');

insert into public.faqs (id, question, answer, is_published, updated_at)
values
  ('00000000-0000-0000-0000-000000000401', 'Is parking free?', 'Yes, on site.', true,
   '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-000000000402', 'Are pets allowed?', 'Not decided yet.', false,
   '2000-01-01 00:00:00+00');

-- Constraints: testimonials (as postgres)
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source) values ('A', 'A long enough quote', 'google')$q$,
  '23514', null, 'a 1-character author name is rejected'
);
select throws_ok(
  format($q$insert into public.testimonials (author_name, quote, source) values (%L, 'A long enough quote', 'google')$q$, repeat('a', 101)),
  '23514', null, 'a 101-character author name is rejected'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, source) values ('Cara', 'google')$q$,
  '23502', null, 'a missing quote is rejected'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source) values ('Cara', '   short   ', 'google')$q$,
  '23514', null, 'a quote under 10 trimmed characters is rejected'
);
select throws_ok(
  format($q$insert into public.testimonials (author_name, quote, source) values ('Cara', %L, 'google')$q$, repeat('q', 601)),
  '23514', null, 'a 601-character quote is rejected'
);
select lives_ok(
  format($q$insert into public.testimonials (author_name, quote, source) values ('Max Quote', %L, 'facebook')$q$, repeat('q', 600)),
  'a 600-character quote is accepted'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source, rating) values ('Cara', 'A long enough quote', 'google', 0)$q$,
  '23514', null, 'rating 0 is rejected'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source, rating) values ('Cara', 'A long enough quote', 'google', 6)$q$,
  '23514', null, 'rating 6 is rejected'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source) values ('Cara', 'A long enough quote', 'yelp')$q$,
  '23514', null, 'an unknown source is rejected'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote) values ('Cara', 'A long enough quote')$q$,
  '23502', null, 'a missing source is rejected'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source, source_url) values ('Cara', 'A long enough quote', 'google', 'http://example.test/r')$q$,
  '23514', null, 'a non-https source_url is rejected'
);
select lives_ok(
  $q$insert into public.testimonials (author_name, quote, source, source_url, rating, review_date)
     values ('Dee Ray', 'A long enough quote', 'google', 'https://example.test/r', 4, '2026-05-01')$q$,
  'a complete testimonial with an https source_url is accepted'
);

-- Constraints: announcements
select throws_ok(
  $q$insert into public.announcements (title) values ('A')$q$,
  '23514', null, 'a 1-character announcement title is rejected'
);
select throws_ok(
  format($q$insert into public.announcements (title) values (%L)$q$, repeat('t', 121)),
  '23514', null, 'a 121-character announcement title is rejected'
);
select throws_ok(
  $q$insert into public.announcements (body) values ('No title')$q$,
  '23502', null, 'a missing announcement title is rejected'
);
select throws_ok(
  format($q$insert into public.announcements (title, body) values ('Long body', %L)$q$, repeat('b', 501)),
  '23514', null, 'a 501-character announcement body is rejected'
);
select throws_ok(
  $q$insert into public.announcements (title, link_label) values ('Label only', 'Read more')$q$,
  '23514', null, 'a link label without a link href is rejected'
);
select throws_ok(
  $q$insert into public.announcements (title, link_href) values ('Href only', '/visit')$q$,
  '23514', null, 'a link href without a link label is rejected'
);
select throws_ok(
  $q$insert into public.announcements (title, link_label, link_href) values ('Bad link', 'Go', 'http://example.test')$q$,
  '23514', null, 'a link href that is neither a path nor https is rejected'
);
select lives_ok(
  $q$insert into public.announcements (title, link_label, link_href) values ('Path link', 'Visit', '/visit')$q$,
  'a path link is accepted'
);
select lives_ok(
  $q$insert into public.announcements (title, link_label, link_href) values ('Https link', 'More', 'https://example.test/x')$q$,
  'an https link is accepted'
);
select throws_ok(
  $q$insert into public.announcements (title, starts_at, ends_at) values ('Backwards', now(), now() - interval '1 hour')$q$,
  '23514', null, 'ends_at before starts_at is rejected'
);
select throws_ok(
  $q$insert into public.announcements (title, starts_at, ends_at) values ('Zero length', now(), now())$q$,
  '23514', null, 'ends_at equal to starts_at is rejected'
);

-- Constraints: faqs
select throws_ok(
  $q$insert into public.faqs (question, answer) values ('Hi?', 'A proper answer')$q$,
  '23514', null, 'a question under 5 characters is rejected'
);
select throws_ok(
  format($q$insert into public.faqs (question, answer) values (%L, 'A proper answer')$q$, repeat('q', 201)),
  '23514', null, 'a 201-character question is rejected'
);
select throws_ok(
  $q$insert into public.faqs (question, answer) values ('A proper question?', 'Nope')$q$,
  '23514', null, 'an answer under 5 characters is rejected'
);
select throws_ok(
  format($q$insert into public.faqs (question, answer) values ('A proper question?', %L)$q$, repeat('a', 2001)),
  '23514', null, 'a 2001-character answer is rejected'
);
select throws_ok(
  $q$insert into public.faqs (question) values ('A proper question?')$q$,
  '23502', null, 'a missing answer is rejected'
);

-- updated_at maintenance
update public.testimonials set author_name = 'Ana Silva, edited'
  where id = '00000000-0000-0000-0000-000000000201';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.testimonials
   where id = '00000000-0000-0000-0000-000000000201'),
  'testimonials.updated_at changes on update'
);
update public.announcements set title = 'Current notice, edited'
  where id = '00000000-0000-0000-0000-000000000301';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.announcements
   where id = '00000000-0000-0000-0000-000000000301'),
  'announcements.updated_at changes on update'
);
update public.faqs set answer = 'Yes, on site, edited.'
  where id = '00000000-0000-0000-0000-000000000401';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.faqs
   where id = '00000000-0000-0000-0000-000000000401'),
  'faqs.updated_at changes on update'
);

-- Remove the rows the constraint checks created, so counts below are exact.
delete from public.testimonials
  where id not in ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202');
delete from public.announcements
  where id not in (
    '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000304'
  );

-- Anonymous
select tests.as_anon();
select is((select count(*) from public.testimonials), 1::bigint, 'anon sees only published testimonials');
select is(
  (select count(*) from public.testimonials where is_published = false), 0::bigint,
  'anon cannot see the unpublished testimonial'
);
select is((select count(*) from public.faqs), 1::bigint, 'anon sees only published faqs');
select is(
  (select count(*) from public.faqs where is_published = false), 0::bigint,
  'anon cannot see the unpublished faq'
);
select is(
  (select count(*) from public.announcements), 1::bigint,
  'anon sees only the published announcement whose window covers now'
);
select is(
  (select title from public.announcements), 'Current notice, edited',
  'the visible announcement is the current one'
);
select is(
  (select count(*) from public.announcements
   where id = '00000000-0000-0000-0000-000000000302'), 0::bigint,
  'anon cannot see a published announcement whose ends_at is in the past'
);
select is(
  (select count(*) from public.announcements
   where id = '00000000-0000-0000-0000-000000000303'), 0::bigint,
  'anon cannot see a published announcement whose starts_at is in the future'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source) values ('Anon', 'A long enough quote', 'direct')$q$,
  '42501', null, 'anon cannot insert testimonials'
);
select throws_ok(
  $q$update public.testimonials set author_name = 'hacked'$q$,
  '42501', null, 'anon cannot update testimonials'
);
select throws_ok(
  $q$delete from public.testimonials$q$,
  '42501', null, 'anon cannot delete testimonials'
);
select throws_ok(
  $q$insert into public.announcements (title) values ('Anon notice')$q$,
  '42501', null, 'anon cannot insert announcements'
);
select throws_ok(
  $q$update public.announcements set title = 'hacked'$q$,
  '42501', null, 'anon cannot update announcements'
);
select throws_ok(
  $q$delete from public.announcements$q$,
  '42501', null, 'anon cannot delete announcements'
);
select throws_ok(
  $q$insert into public.faqs (question, answer) values ('Anon question?', 'Anon answer')$q$,
  '42501', null, 'anon cannot insert faqs'
);
select throws_ok(
  $q$update public.faqs set answer = 'hacked'$q$,
  '42501', null, 'anon cannot update faqs'
);
select throws_ok(
  $q$delete from public.faqs$q$,
  '42501', null, 'anon cannot delete faqs'
);
select tests.reset_role();

-- Authenticated non-admin
select tests.authenticate_as(:'b');
select is((select count(*) from public.testimonials), 1::bigint, 'non-admin sees only published testimonials');
select is((select count(*) from public.faqs), 1::bigint, 'non-admin sees only published faqs');
select is(
  (select count(*) from public.announcements), 1::bigint,
  'non-admin sees only the currently active announcement'
);
select throws_ok(
  $q$insert into public.testimonials (author_name, quote, source) values ('User', 'A long enough quote', 'direct')$q$,
  '42501', null, 'non-admin cannot insert testimonials'
);
select throws_ok(
  $q$insert into public.announcements (title) values ('User notice')$q$,
  '42501', null, 'non-admin cannot insert announcements'
);
select throws_ok(
  $q$insert into public.faqs (question, answer) values ('User question?', 'User answer')$q$,
  '42501', null, 'non-admin cannot insert faqs'
);
-- Updates and deletes filtered out by RLS affect 0 rows without raising.
update public.testimonials set author_name = 'hacked';
update public.announcements set title = 'hacked';
update public.faqs set answer = 'hacked';
delete from public.testimonials;
delete from public.announcements;
delete from public.faqs;
select tests.reset_role();

select is(
  (select count(*) from public.testimonials where author_name = 'hacked')
  + (select count(*) from public.announcements where title = 'hacked')
  + (select count(*) from public.faqs where answer = 'hacked'),
  0::bigint,
  'non-admin updates changed nothing'
);
select is((select count(*) from public.testimonials), 2::bigint, 'non-admin delete removed no testimonials');
select is((select count(*) from public.announcements), 4::bigint, 'non-admin delete removed no announcements');
select is((select count(*) from public.faqs), 2::bigint, 'non-admin delete removed no faqs');

-- Admin
select tests.authenticate_as(:'a');
select is((select count(*) from public.testimonials), 2::bigint, 'admin sees published and draft testimonials');
select is((select count(*) from public.announcements), 4::bigint, 'admin sees every announcement regardless of window');
select is((select count(*) from public.faqs), 2::bigint, 'admin sees published and draft faqs');

select lives_ok(
  $q$insert into public.testimonials (id, author_name, quote, source, is_published)
     values ('00000000-0000-0000-0000-000000000203', 'Eli Moss', 'Wonderful place to unwind.', 'direct', true)$q$,
  'admin inserts a testimonial'
);
select lives_ok(
  $q$update public.testimonials set quote = 'Wonderful place to unwind, truly.'
     where id = '00000000-0000-0000-0000-000000000203'$q$,
  'admin updates a testimonial'
);
select is(
  (select quote from public.testimonials where id = '00000000-0000-0000-0000-000000000203'),
  'Wonderful place to unwind, truly.',
  'admin testimonial update took effect'
);
select lives_ok(
  $q$delete from public.testimonials where id = '00000000-0000-0000-0000-000000000203'$q$,
  'admin deletes a testimonial'
);

select lives_ok(
  $q$insert into public.announcements (id, title, is_published)
     values ('00000000-0000-0000-0000-000000000305', 'Admin notice', true)$q$,
  'admin inserts an announcement'
);
select lives_ok(
  $q$update public.announcements set title = 'Admin notice, edited'
     where id = '00000000-0000-0000-0000-000000000305'$q$,
  'admin updates an announcement'
);
select is(
  (select title from public.announcements where id = '00000000-0000-0000-0000-000000000305'),
  'Admin notice, edited',
  'admin announcement update took effect'
);
select lives_ok(
  $q$delete from public.announcements where id = '00000000-0000-0000-0000-000000000305'$q$,
  'admin deletes an announcement'
);

select lives_ok(
  $q$insert into public.faqs (id, question, answer, is_published)
     values ('00000000-0000-0000-0000-000000000403', 'Is there a cafe?', 'Yes, open daily.', true)$q$,
  'admin inserts a faq'
);
select lives_ok(
  $q$update public.faqs set answer = 'Yes, open daily until 5.'
     where id = '00000000-0000-0000-0000-000000000403'$q$,
  'admin updates a faq'
);
select is(
  (select answer from public.faqs where id = '00000000-0000-0000-0000-000000000403'),
  'Yes, open daily until 5.',
  'admin faq update took effect'
);
select lives_ok(
  $q$delete from public.faqs where id = '00000000-0000-0000-0000-000000000403'$q$,
  'admin deletes a faq'
);
select tests.reset_role();

select * from finish();
rollback;
