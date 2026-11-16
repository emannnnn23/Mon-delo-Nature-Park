begin;
select plan(48);

select policies_are(
  'public', 'contact_messages',
  array[
    'contact_messages_select_admin', 'contact_messages_update_admin',
    'contact_messages_delete_admin'
  ],
  'contact_messages has select, update and delete policies only'
);
select ok(
  not has_table_privilege('anon', 'public.contact_messages', 'insert'),
  'anon has no insert grant'
);
select ok(
  not has_table_privilege('authenticated', 'public.contact_messages', 'insert'),
  'authenticated has no insert grant'
);
select ok(
  not has_table_privilege('anon', 'public.contact_messages', 'select'),
  'anon has no select grant'
);
select ok(
  (select p.prosecdef
     from pg_proc p
    where p.oid = 'public.submit_contact_message(text,text,text,text,text,text,integer)'::regprocedure),
  'submit_contact_message is security definer'
);
select ok(
  (select p.proconfig @> array['search_path=""']
     from pg_proc p
    where p.oid = 'public.submit_contact_message(text,text,text,text,text,text,integer)'::regprocedure),
  'submit_contact_message pins an empty search_path'
);
select ok(
  has_function_privilege('anon', 'public.submit_contact_message(text,text,text,text,text,text,integer)', 'execute'),
  'anon can execute submit_contact_message'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_contact_message(text,text,text,text,text,text,integer)', 'execute'),
  'authenticated can execute submit_contact_message'
);
select ok(
  not exists (
    select 1
      from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     where p.oid = 'public.submit_contact_message(text,text,text,text,text,text,integer)'::regprocedure
       and a.grantee = 0
  ),
  'PUBLIC cannot execute submit_contact_message'
);

select tests.create_user('admin-a@example.test', true) as a \gset
select tests.create_user('user-b@example.test') as b \gset

-- Valid call as anon: stored trimmed, status new -----------------------------
select tests.as_anon();
select is(
  public.submit_contact_message(
    '  Ana Silva  ', '  Ana@Example.test ', '  +63 912 345 6789 ', '  Group visit  ',
    '  We would like to visit with twelve people.  ', '', 5000),
  'ok', 'a valid submission returns ok'
);
select throws_ok($q$select count(*) from public.contact_messages$q$, '42501', null,
  'anon cannot select contact_messages');
select throws_ok(
  $q$insert into public.contact_messages (full_name, email, subject, message)
     values ('Direct Insert', 'direct@example.test', 'Direct', 'A direct insert attempt.')$q$,
  '42501', null, 'anon cannot insert directly'
);
select tests.reset_role();

select is((select count(*)::int from public.contact_messages), 1, 'one row stored');
select is(
  (select full_name from public.contact_messages), 'Ana Silva', 'full_name is trimmed');
select is(
  (select email from public.contact_messages), 'Ana@Example.test', 'email is trimmed');
select is(
  (select phone from public.contact_messages), '+63 912 345 6789', 'phone is trimmed');
select is(
  (select subject from public.contact_messages), 'Group visit', 'subject is trimmed');
select is(
  (select message from public.contact_messages),
  'We would like to visit with twelve people.', 'message is trimmed');
select is(
  (select status from public.contact_messages), 'new', 'status defaults to new');

-- Empty phone becomes null ----------------------------------------------------
select tests.as_anon();
select is(
  public.submit_contact_message(
    'Ben Costa', 'ben@example.test', '   ', 'Opening hours', 'What are the opening hours?', '', 4000),
  'ok', 'a blank phone is accepted'
);
select tests.reset_role();
select is(
  (select phone from public.contact_messages where email = 'ben@example.test'),
  null, 'a blank phone is stored as null'
);

-- Honeypot and fill time: ok, nothing stored, not counted ---------------------
select tests.as_anon();
select is(
  public.submit_contact_message(
    'Bot Name', 'bot@example.test', null, 'Buy now', 'Cheap offers are waiting for you.', 'x', 5000),
  'ok', 'a filled honeypot returns ok'
);
select is(
  public.submit_contact_message(
    'Fast Name', 'fast@example.test', null, 'Too fast', 'Submitted in under three seconds.', '', 2999),
  'ok', '2999 ms returns ok'
);
select is(
  public.submit_contact_message(
    'Null Name', 'nulltime@example.test', null, 'No timing', 'Submitted without a fill time.', '', null),
  'ok', 'a null elapsed time returns ok'
);
select tests.reset_role();
select is(
  (select count(*)::int from public.contact_messages
    where email in ('bot@example.test', 'fast@example.test', 'nulltime@example.test')),
  0, 'discarded submissions are not stored'
);

-- Discarded submissions never count toward the per-email limit ----------------
select tests.as_anon();
select is(
  public.submit_contact_message(
    'Dan Reyes', 'dan@example.test', null, 'Discarded', 'Discarded message one here.', 'x', 5000),
  'ok', 'setup submission 1 is accepted'
);
select is(
  public.submit_contact_message(
    'Dan Reyes', 'dan@example.test', null, 'Discarded', 'Discarded message two here.', '', 100),
  'ok', 'setup submission 2 is accepted'
);
select is(
  public.submit_contact_message(
    'Dan Reyes', 'dan@example.test', null, 'Discarded', 'Discarded message three here.', 'x', 5000),
  'ok', 'setup submission 3 is accepted'
);
select is(
  public.submit_contact_message(
    'Dan Reyes', 'dan@example.test', null, 'Real one', 'A real message after discards.', '', 4000),
  'ok', 'discards do not count toward the per-email limit'
);
select tests.reset_role();

-- Invalid fields raise 23514 ---------------------------------------------------
select tests.as_anon();
select throws_ok(
  $q$select public.submit_contact_message('A', 'e1@example.test', null, 'Subject', 'A long enough message.', '', 5000)$q$,
  '23514', null, 'a 1-character name is rejected');
select throws_ok(
  $q$select public.submit_contact_message('Eve Name', 'nope', null, 'Subject', 'A long enough message.', '', 5000)$q$,
  '23514', null, 'an invalid email is rejected');
select throws_ok(
  $q$select public.submit_contact_message('Eve Name', 'e2@example.test', 'abc', 'Subject', 'A long enough message.', '', 5000)$q$,
  '23514', null, 'a phone with letters is rejected');
select throws_ok(
  $q$select public.submit_contact_message('Eve Name', 'e3@example.test', null, 'S', 'A long enough message.', '', 5000)$q$,
  '23514', null, 'a 1-character subject is rejected');
select throws_ok(
  $q$select public.submit_contact_message('Eve Name', 'e4@example.test', null, 'Subject', 'short', '', 5000)$q$,
  '23514', null, 'a short message is rejected');
select throws_ok(
  format($q$select public.submit_contact_message('Eve Name', 'e5@example.test', null, 'Subject', %L, '', 5000)$q$, repeat('m', 5001)),
  '23514', null, 'a 5001-character message is rejected');
select throws_ok(
  $q$select public.submit_contact_message('Eve Name', 'e6@example.test', repeat('1', 31), 'Subject', 'A long enough message.', '', 5000)$q$,
  '23514', null, 'a 31-character phone is rejected');
select tests.reset_role();

-- Per-email limit: the 4th within an hour is refused, case-insensitively -----
select tests.as_anon();
select is(
  public.submit_contact_message(
    'Fay Lim', 'fay@example.test', null, 'First', 'First message from Fay today.', '', 5000),
  'ok', 'setup submission 4 is accepted'
);
select is(
  public.submit_contact_message(
    'Fay Lim', 'FAY@example.test', null, 'Second', 'Second message from Fay today.', '', 5000),
  'ok', 'setup submission 5 is accepted'
);
select is(
  public.submit_contact_message(
    'Fay Lim', 'fay@example.test', null, 'Third', 'Third message from Fay today.', '', 5000),
  'ok', 'setup submission 6 is accepted'
);
select throws_ok(
  $q$select public.submit_contact_message('Fay Lim', 'Fay@Example.test', null, 'Fourth', 'Fourth message from Fay today.', '', 5000)$q$,
  'P0001', 'rate_limited', 'the 4th message from the same email is rate limited'
);
select is(
  public.submit_contact_message(
    'Gus Tan', 'gus@example.test', null, 'Other sender', 'A different sender is unaffected.', '', 5000),
  'ok', 'another email is not affected by the per-email limit'
);
select tests.reset_role();

-- Admin access ----------------------------------------------------------------
select tests.authenticate_as(:'b'::uuid);
select is((select count(*)::int from public.contact_messages), 0,
  'a non-admin sees no messages');
select tests.reset_role();

select tests.authenticate_as(:'a'::uuid);
select ok((select count(*)::int from public.contact_messages) >= 1,
  'an admin can read messages');
update public.contact_messages set status = 'read' where email = 'Ana@Example.test';
select is(
  (select status from public.contact_messages where email = 'Ana@Example.test'),
  'read', 'an admin can mark a message read');
select throws_ok(
  $q$update public.contact_messages set status = 'spam' where email = 'Ana@Example.test'$q$,
  '23514', null, 'an unknown status is rejected');
delete from public.contact_messages where email = 'ben@example.test';
select is(
  (select count(*)::int from public.contact_messages where email = 'ben@example.test'),
  0, 'an admin can delete a message');
select tests.reset_role();

-- Global limit: 50 rows in the last hour ---------------------------------------
select tests.as_anon();
select is(
  public.submit_contact_message(
    'Pre Limit', 'prelimit@example.test', null, 'Before the cap', 'Sent while under the global cap.', '', 5000),
  'ok', 'a submission under the global cap is accepted'
);
select tests.reset_role();
insert into public.contact_messages (full_name, email, subject, message, submitted_at)
select 'Bulk Sender', 'bulk' || g || '@example.test', 'Bulk', 'Bulk seeded message body.', now()
  from generate_series(1, 50) g;
select tests.as_anon();
select throws_ok(
  $q$select public.submit_contact_message('Late Sender', 'late@example.test', null, 'After the cap', 'Sent after the global cap.', '', 5000)$q$,
  'P0001', 'rate_limited', 'the global hourly cap raises rate_limited'
);
select tests.reset_role();

select * from finish();
rollback;
