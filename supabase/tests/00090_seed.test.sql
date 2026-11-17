begin;
select plan(29);

-- Runs against the seeded database (supabase db reset applies seed.sql).

-- site_settings ----------------------------------------------------------------
select is((select count(*)::int from public.site_settings), 1, 'one site_settings row is seeded');
select is(
  (select park_name from public.site_settings), 'Mondelos Nature Park', 'park name is seeded'
);
select is(
  (select google_rating from public.site_settings), 4.6::numeric, 'google rating is 4.6'
);
select is(
  (select google_review_count from public.site_settings), 70, 'google review count is 70'
);
select is(
  (select address_line from public.site_settings),
  'M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines',
  'address line is the real address'
);
select is(
  (select plus_code from public.site_settings), 'M8GV+8GP', 'plus code is seeded'
);
select ok(
  (select phone is null and email is null and opening_hours is null
     and facebook_url is null and instagram_url is null
     and tiktok_url is null and youtube_url is null
     and tagline is null and short_description is null
     and latitude is null and longitude is null
     and maps_embed_url is null and maps_listing_url is null
     and default_og_media_id is null
   from public.site_settings),
  'unconfirmed contact, social, map and branding fields are null'
);

-- never-sampled content ----------------------------------------------------------
select is((select count(*)::int from public.testimonials), 0, 'no testimonials are seeded');
select is((select count(*)::int from public.faqs), 0, 'no faqs are seeded');
select is((select count(*)::int from public.announcements), 0, 'no announcements are seeded');
select is((select count(*)::int from public.media), 0, 'no media rows are seeded');
select is((select count(*)::int from public.gallery_images), 0, 'no gallery images are seeded');

-- experiences --------------------------------------------------------------------
select is(
  (select count(*)::int from public.attractions
    where kind = 'experience' and is_published and is_sample),
  4, 'four published sample experiences'
);
select results_eq(
  $q$select name, icon from public.attractions
      where kind = 'experience' order by sort_order$q$,
  $q$values ('Beautiful Gardens', 'leaf'), ('Scenic Views', 'mountain'),
            ('Dining', 'utensils'), ('Relaxing Pool', 'waves')$q$,
  'experience names and icons match the brief, in order'
);
select is(
  (select summary from public.attractions where slug = 'dining'),
  'Enjoy a meal in a relaxing garden setting.',
  'dining summary is the agreed wording'
);

-- attractions --------------------------------------------------------------------
select cmp_ok(
  (select count(*)::int from public.attractions
    where kind = 'attraction' and is_published and is_sample),
  '>=', 3, 'at least three published sample attractions'
);
select cmp_ok(
  (select count(*)::int from public.attractions
    where kind = 'attraction' and is_featured),
  '>=', 3, 'at least three featured attractions'
);
select is(
  (select count(*)::int from public.attractions
    where slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  0, 'every attraction slug is valid'
);
select ok(
  not exists (
    select 1 from public.attractions
     where is_sample is not true or is_published is not true
  ),
  'every seeded attraction is a published sample'
);

-- page sections ---------------------------------------------------------------------
select is(
  (select heading from public.page_sections where page = 'home' and key = 'hero'),
  'Find Your Peace in Nature.', 'home hero heading is the real heading'
);
select is(
  (select is_sample from public.page_sections where page = 'home' and key = 'hero'),
  false, 'home hero is not a sample'
);
select is(
  (select body from public.page_sections where page = 'home' and key = 'intro'),
  $t$Discover a peaceful escape surrounded by nature, beautiful landscapes, and unforgettable moments. Whether you're looking for a relaxing getaway, a scenic view, or meaningful time with family and friends, Mondelos Nature Park welcomes you.$t$,
  'home intro body is the exact intro copy'
);
select is(
  (select is_sample from public.page_sections where page = 'home' and key = 'intro'),
  false, 'home intro is not a sample'
);
select is(
  (select count(*)::int from public.page_sections
    where page = 'about' and key in ('story', 'mission', 'vision') and is_sample),
  3, 'about story, mission and vision are samples'
);
select is(
  (select count(*)::int from public.page_sections where not is_published),
  0, 'every seeded section is published'
);
select is(
  (select count(*)::int from public.page_sections where page = 'home'),
  6, 'home has six sections'
);

-- gallery categories --------------------------------------------------------------------
select results_eq(
  $q$select name, slug, is_published from public.gallery_categories order by sort_order$q$,
  $q$values ('Landscapes', 'landscapes', true), ('Gardens', 'gardens', true),
            ('Facilities', 'facilities', true)$q$,
  'gallery categories are seeded and published'
);

-- visibility to anon --------------------------------------------------------------------
select tests.as_anon();
select is(
  (select count(*)::int from public.attractions where kind = 'experience'),
  4, 'anon sees the four experiences'
);
select is(
  (select count(*)::int from public.site_settings), 1, 'anon sees the settings row'
);
select tests.reset_role();

select * from finish();
rollback;
