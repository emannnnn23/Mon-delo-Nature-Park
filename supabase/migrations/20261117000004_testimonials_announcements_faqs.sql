-- Testimonials, announcements and FAQs.
-- Same grant/policy pattern as the earlier content migrations: revoke all,
-- explicit grants, one policy per operation, admin writes gated by is_admin().
-- The checks below mirror the admin form rules (spec §8) so the database
-- enforces them even if a client skips validation.

-- testimonials ---------------------------------------------------------------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(btrim(author_name, E' \t\r\n')) between 2 and 100),
  quote text not null check (char_length(btrim(quote, E' \t\r\n')) between 10 and 600),
  rating smallint check (rating between 1 and 5),
  source text not null check (source in ('google', 'facebook', 'direct')),
  source_url text check (source_url ~ '^https://'),
  review_date date,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonials_is_published_sort_order_idx
  on public.testimonials (is_published, sort_order);

alter table public.testimonials enable row level security;

revoke all on public.testimonials from anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

create policy testimonials_select_published
  on public.testimonials
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy testimonials_insert_admin
  on public.testimonials
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy testimonials_update_admin
  on public.testimonials
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy testimonials_delete_admin
  on public.testimonials
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- announcements --------------------------------------------------------------
-- Public reads need the row to be published and inside its date window.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title, E' \t\r\n')) between 2 and 120),
  body text check (char_length(body) <= 500),
  link_label text check (char_length(btrim(link_label, E' \t\r\n')) > 0),
  link_href text check (link_href ~ '^(/([^/]|$)|https://)'),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A link needs both its label and its target, or neither.
  constraint announcements_link_pair_check
    check ((link_label is null) = (link_href is null)),
  constraint announcements_window_check
    check (ends_at is null or ends_at > starts_at)
);

create index announcements_is_published_starts_at_idx
  on public.announcements (is_published, starts_at desc);

alter table public.announcements enable row level security;

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

create policy announcements_select_published
  on public.announcements
  for select
  to anon, authenticated
  using (
    (is_published and starts_at <= now() and (ends_at is null or ends_at > now()))
    or (select public.is_admin())
  );

create policy announcements_insert_admin
  on public.announcements
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy announcements_update_admin
  on public.announcements
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy announcements_delete_admin
  on public.announcements
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- faqs -----------------------------------------------------------------------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(btrim(question, E' \t\r\n')) between 5 and 200),
  answer text not null check (char_length(btrim(answer, E' \t\r\n')) between 5 and 2000),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_is_published_sort_order_idx
  on public.faqs (is_published, sort_order);

alter table public.faqs enable row level security;

revoke all on public.faqs from anon, authenticated;
grant select on public.faqs to anon, authenticated;
grant insert, update, delete on public.faqs to authenticated;

create policy faqs_select_published
  on public.faqs
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy faqs_insert_admin
  on public.faqs
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy faqs_update_admin
  on public.faqs
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy faqs_delete_admin
  on public.faqs
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();
