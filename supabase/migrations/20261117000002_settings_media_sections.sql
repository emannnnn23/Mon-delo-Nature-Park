-- Site settings (single row), media library and editable page sections.
-- Grant/policy pattern for content tables: revoke all, explicit grants,
-- one policy per operation naming its roles, admin writes gated by is_admin().

-- media ----------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_base_path text not null check (length(trim(storage_base_path)) > 0),
  alt_text text not null check (length(trim(alt_text)) > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  -- width -> storage path, e.g. {"480": "2026/x-ab12cd-480.webp"}
  variants jsonb not null,
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
-- by the seed (never through the API), so there is no insert or delete grant.
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  park_name text not null check (length(trim(park_name)) > 0),
  tagline text,
  short_description text,
  address_line text,
  plus_code text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  maps_embed_url text,
  maps_listing_url text,
  phone text,
  email text,
  opening_hours text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
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

-- page_sections --------------------------------------------------------------
create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('home', 'about', 'visit')),
  key text not null check (length(trim(key)) > 0),
  eyebrow text,
  heading text,
  body text,
  cta_label text,
  cta_href text,
  media_id uuid references public.media (id) on delete restrict,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page, key)
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
