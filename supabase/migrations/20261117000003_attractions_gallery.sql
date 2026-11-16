-- Attractions (and experience cards), their extra images, and the gallery.
-- Same grant/policy pattern as the settings migration: revoke all, explicit
-- grants, one policy per operation, admin writes gated by is_admin().

-- attractions ----------------------------------------------------------------
create table public.attractions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('attraction', 'experience')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  summary text not null check (char_length(summary) between 1 and 160),
  description text,
  -- Fixed Lucide icon list; Phase 3's icon picker uses the same names.
  icon text check (icon in (
    'leaf', 'mountain', 'utensils', 'waves', 'tent', 'trees',
    'sunset', 'camera', 'users', 'flower-2', 'bed-double', 'coffee'
  )),
  cover_media_id uuid references public.media (id) on delete restrict,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Experience cards are icon cards; attractions may use a cover image instead.
  constraint attractions_experience_icon_check
    check (kind <> 'experience' or icon is not null)
);

create index attractions_is_published_sort_order_idx
  on public.attractions (is_published, sort_order);
create index attractions_kind_is_published_sort_order_idx
  on public.attractions (kind, is_published, sort_order);
create index attractions_cover_media_id_idx
  on public.attractions (cover_media_id);

alter table public.attractions enable row level security;

revoke all on public.attractions from anon, authenticated;
grant select on public.attractions to anon, authenticated;
grant insert, update, delete on public.attractions to authenticated;

create policy attractions_select_published
  on public.attractions
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy attractions_insert_admin
  on public.attractions
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy attractions_update_admin
  on public.attractions
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy attractions_delete_admin
  on public.attractions
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger attractions_set_updated_at
  before update on public.attractions
  for each row execute function public.set_updated_at();

-- attraction_images ----------------------------------------------------------
-- No publish flag: an image is visible when its parent attraction is published.
create table public.attraction_images (
  id uuid primary key default gen_random_uuid(),
  attraction_id uuid not null references public.attractions (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete restrict,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index attraction_images_attraction_id_idx
  on public.attraction_images (attraction_id);
create index attraction_images_media_id_idx
  on public.attraction_images (media_id);

alter table public.attraction_images enable row level security;

revoke all on public.attraction_images from anon, authenticated;
grant select on public.attraction_images to anon, authenticated;
grant insert, update, delete on public.attraction_images to authenticated;

create policy attraction_images_select_published
  on public.attraction_images
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.attractions a
    where a.id = attraction_id and a.is_published
  )
  or (select public.is_admin()));

create policy attraction_images_insert_admin
  on public.attraction_images
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy attraction_images_update_admin
  on public.attraction_images
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy attraction_images_delete_admin
  on public.attraction_images
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger attraction_images_set_updated_at
  before update on public.attraction_images
  for each row execute function public.set_updated_at();

-- gallery_categories ---------------------------------------------------------
create table public.gallery_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_categories_is_published_sort_order_idx
  on public.gallery_categories (is_published, sort_order);

alter table public.gallery_categories enable row level security;

revoke all on public.gallery_categories from anon, authenticated;
grant select on public.gallery_categories to anon, authenticated;
grant insert, update, delete on public.gallery_categories to authenticated;

create policy gallery_categories_select_published
  on public.gallery_categories
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy gallery_categories_insert_admin
  on public.gallery_categories
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy gallery_categories_update_admin
  on public.gallery_categories
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy gallery_categories_delete_admin
  on public.gallery_categories
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger gallery_categories_set_updated_at
  before update on public.gallery_categories
  for each row execute function public.set_updated_at();

-- gallery_images -------------------------------------------------------------
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media (id) on delete restrict,
  category_id uuid references public.gallery_categories (id) on delete set null,
  caption text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_images_is_published_sort_order_idx
  on public.gallery_images (is_published, sort_order);
create index gallery_images_media_id_idx
  on public.gallery_images (media_id);
create index gallery_images_category_id_idx
  on public.gallery_images (category_id);

alter table public.gallery_images enable row level security;

revoke all on public.gallery_images from anon, authenticated;
grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_images to authenticated;

create policy gallery_images_select_published
  on public.gallery_images
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy gallery_images_insert_admin
  on public.gallery_images
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy gallery_images_update_admin
  on public.gallery_images
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy gallery_images_delete_admin
  on public.gallery_images
  for delete
  to authenticated
  using ((select public.is_admin()));

create trigger gallery_images_set_updated_at
  before update on public.gallery_images
  for each row execute function public.set_updated_at();
