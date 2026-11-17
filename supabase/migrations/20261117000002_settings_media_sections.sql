-- Site settings (single row), media library and editable page sections.
-- Grant/policy pattern for content tables: revoke all, explicit grants,
-- one policy per operation naming its roles, admin writes gated by is_admin().

-- media ----------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_base_path text not null check (length(btrim(storage_base_path, E' \t\r\n')) > 0),
  alt_text text not null check (length(btrim(alt_text, E' \t\r\n')) > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  -- width -> storage path, e.g. {"480": "2026/x-ab12cd-480.webp"}
  variants jsonb not null check (jsonb_typeof(variants) = 'object'),
  focal_x smallint not null default 50 check (focal_x between 0 and 100),
  focal_y smallint not null default 50 check (focal_y between 0 and 100),
  original_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media enable row level security;

revoke all on public.media from anon, authenticated;
grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

create policy media_select_public
  on public.media
  for select
  to anon, authenticated
  using (true);

create policy media_insert_admin
  on public.media
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy media_update_admin
  on public.media
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy media_delete_admin
  on public.media
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

-- site_settings --------------------------------------------------------------
-- One row only: "singleton" is unique and can only be true. The row is created
-- by this migration (never through the API), so there is no insert or delete
-- grant. The checks mirror the admin form rules (spec section 8) so the
-- database enforces them even if a client skips validation.
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  park_name text not null check (length(btrim(park_name, E' \t\r\n')) > 0),
  tagline text,
  short_description text,
  address_line text not null check (length(btrim(address_line, E' \t\r\n')) > 0),
  plus_code text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  maps_embed_url text check (maps_embed_url ~ '^https://www\.google\.com/maps/embed'),
  maps_listing_url text check (maps_listing_url ~ '^https://'),
  phone text check (phone ~ '^[0-9 +()-]{0,30}$'),
  email text check (
    char_length(email) <= 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  opening_hours text,
  facebook_url text check (facebook_url ~ '^https://'),
  instagram_url text check (instagram_url ~ '^https://'),
  tiktok_url text check (tiktok_url ~ '^https://'),
  youtube_url text check (youtube_url ~ '^https://'),
  google_rating numeric(2, 1) check (google_rating between 0 and 5),
  google_review_count integer check (google_review_count >= 0),
  default_og_media_id uuid references public.media (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_settings_default_og_media_id_idx
  on public.site_settings (default_og_media_id);

alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

create policy site_settings_select_public
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

create policy site_settings_update_admin
  on public.site_settings
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- The one row the site and the admin edit. Created here so a pushed database
-- always has it; everything else is filled in through the admin.
insert into public.site_settings (park_name, address_line)
values ('Mondelos Nature Park', 'M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines')
on conflict (singleton) do nothing;

-- page_sections --------------------------------------------------------------
create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('home', 'about', 'visit')),
  key text not null check (length(btrim(key, E' \t\r\n')) > 0),
  eyebrow text check (char_length(eyebrow) <= 60),
  heading text check (char_length(heading) <= 160),
  body text check (char_length(body) <= 4000),
  cta_label text check (char_length(btrim(cta_label, E' \t\r\n')) between 1 and 40),
  cta_href text check (cta_href ~ '^(/([^/]|$)|https://)'),
  media_id uuid references public.media (id) on delete restrict,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page, key),
  -- A call to action needs both its label and its target, or neither.
  constraint page_sections_cta_pair_check
    check ((cta_label is null) = (cta_href is null))
);

create index page_sections_is_published_sort_order_idx
  on public.page_sections (is_published, sort_order);
create index page_sections_media_id_idx
  on public.page_sections (media_id);

alter table public.page_sections enable row level security;

revoke all on public.page_sections from anon, authenticated;
grant select on public.page_sections to anon, authenticated;
grant insert, update, delete on public.page_sections to authenticated;

create policy page_sections_select_published
  on public.page_sections
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy page_sections_insert_admin
  on public.page_sections
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy page_sections_update_admin
  on public.page_sections
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy page_sections_delete_admin
  on public.page_sections
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger page_sections_set_updated_at
  before update on public.page_sections
  for each row execute function public.set_updated_at();
