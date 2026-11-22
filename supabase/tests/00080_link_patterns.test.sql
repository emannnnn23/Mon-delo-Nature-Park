begin;
select plan(15);

-- Internal links: "/" alone or "/" followed by a character that is not "/",
-- "\" or a control character; otherwise https://. Browsers turn "/\host" and
-- "/<control>/host" into links to other sites, so those must be rejected.

-- page_sections.cta_href -----------------------------------------------------
select throws_ok(
  $q$insert into public.page_sections (page, key, cta_label, cta_href)
     values ('home', 'lp-backslash', 'Go', '/\evil.example')$q$,
  '23514', null,
  'page_sections rejects a cta_href that starts with "/\"'
);
select throws_ok(
  $q$insert into public.page_sections (page, key, cta_label, cta_href)
     values ('home', 'lp-tab', 'Go', E'/\tevil')$q$,
  '23514', null,
  'page_sections rejects a cta_href with a control character after the slash'
);
select throws_ok(
  $q$insert into public.page_sections (page, key, cta_label, cta_href)
     values ('home', 'lp-double', 'Go', '//evil')$q$,
  '23514', null,
  'page_sections rejects a protocol-relative cta_href'
);
select lives_ok(
  $q$insert into public.page_sections (page, key, cta_label, cta_href) values
     ('home', 'lp-root', 'Go', '/'),
     ('home', 'lp-visit', 'Go', '/visit'),
     ('home', 'lp-https', 'Go', 'https://x.ph')$q$,
  'page_sections accepts "/", "/visit" and an https:// cta_href'
);
select throws_ok(
  $q$update public.page_sections set cta_href = '/\evil.example'
     where page = 'home' and key = 'lp-visit'$q$,
  '23514', null,
  'page_sections rejects updating a cta_href to "/\evil.example"'
);

-- announcements.link_href ----------------------------------------------------
select throws_ok(
  $q$insert into public.announcements (title, starts_at, link_label, link_href)
     values ('Notice one', now(), 'Go', '/\evil.example')$q$,
  '23514', null,
  'announcements rejects a link_href that starts with "/\"'
);
select throws_ok(
  $q$insert into public.announcements (title, starts_at, link_label, link_href)
     values ('Notice two', now(), 'Go', E'/\tevil')$q$,
  '23514', null,
  'announcements rejects a link_href with a control character after the slash'
);
select throws_ok(
  $q$insert into public.announcements (title, starts_at, link_label, link_href)
     values ('Notice three', now(), 'Go', '//evil')$q$,
  '23514', null,
  'announcements rejects a protocol-relative link_href'
);
select lives_ok(
  $q$insert into public.announcements (title, starts_at, link_label, link_href) values
     ('Notice root', now(), 'Go', '/'),
     ('Notice visit', now(), 'Go', '/visit'),
     ('Notice https', now(), 'Go', 'https://x.ph')$q$,
  'announcements accepts "/", "/visit" and an https:// link_href'
);
select throws_ok(
  $q$update public.announcements set link_href = '/\evil.example'
     where title = 'Notice visit'$q$,
  '23514', null,
  'announcements rejects updating a link_href to "/\evil.example"'
);

-- The both-or-neither rules still hold.
select throws_ok(
  $q$insert into public.page_sections (page, key, cta_label)
     values ('home', 'lp-half', 'Go')$q$,
  '23514', null,
  'page_sections still requires cta_label and cta_href together'
);
select throws_ok(
  $q$insert into public.announcements (title, starts_at, link_href)
     values ('Notice half', now(), '/visit')$q$,
  '23514', null,
  'announcements still requires link_label and link_href together'
);

-- Ordinary rows without links, and the seeded rows, are untouched.
select lives_ok(
  $q$insert into public.page_sections (page, key) values ('home', 'lp-nolink')$q$,
  'page_sections accepts a row without a call to action'
);
select lives_ok(
  $q$insert into public.announcements (title, starts_at) values ('Notice plain', now())$q$,
  'announcements accepts a row without a link'
);

-- Each table has exactly one link-pattern check (the old one was replaced).
select is(
  (
    select count(*)
    from pg_constraint
    where conrelid in ('public.page_sections'::regclass, 'public.announcements'::regclass)
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ 'https://'
  ),
  2::bigint,
  'exactly one https-link check per table'
);

select * from finish();
rollback;
