-- Seed data for the demo (applied by `supabase db reset`).
-- Real values come from the client brief. Anything unconfirmed is either null
-- or published with is_sample = true, worded as illustrative with no specific
-- facts. Testimonials, FAQs, announcements, media and gallery images are never
-- seeded. src/content/placeholders.ts mirrors this file.

-- site_settings ----------------------------------------------------------------
-- The row itself is created by migration 0002; the seed only fills in the demo
-- values.
update public.site_settings
set plus_code = 'M8GV+8GP',
    google_rating = 4.6,
    google_review_count = 70;

-- page_sections ------------------------------------------------------------------
insert into public.page_sections
  (page, key, eyebrow, heading, body, cta_label, cta_href, is_published, sort_order, is_sample)
values
  ('home', 'hero', null, 'Find Your Peace in Nature.', null, null, null, true, 1, false),
  ('home', 'intro', 'WELCOME TO', 'Mondelos Nature Park',
   $t$Discover a peaceful escape surrounded by nature, beautiful landscapes, and unforgettable moments. Whether you're looking for a relaxing getaway, a scenic view, or meaningful time with family and friends, Mondelos Nature Park welcomes you.$t$,
   'Learn More', '/about', true, 2, false),
  ('home', 'discover', null, 'Discover the Park', null, null, null, true, 3, false),
  ('home', 'gallery', null, 'Our Gallery', 'Capture the beauty of Mondelos Nature Park.',
   null, null, true, 4, false),
  ('home', 'testimonials', null, 'What Our Guests Say', null, null, null, true, 5, false),
  ('home', 'visit', null, 'Visit Us', null, null, null, true, 6, false),

  ('about', 'intro', null, 'About the Park',
   'Sample text. A short introduction to the park will appear here once it is confirmed.',
   null, null, true, 1, true),
  ('about', 'story', null, 'Our Story',
   'Sample text. The story of the park will appear here once it is confirmed.',
   null, null, true, 2, true),
  ('about', 'mission', null, 'Our Mission',
   'Sample text. The park''s mission will appear here once it is confirmed.',
   null, null, true, 3, true),
  ('about', 'vision', null, 'Our Vision',
   'Sample text. The park''s vision will appear here once it is confirmed.',
   null, null, true, 4, true),
  ('about', 'surroundings', null, 'Our Surroundings',
   'Sample text. A description of the park''s surroundings will appear here once it is confirmed.',
   null, null, true, 5, true),

  ('visit', 'intro', null, 'Plan Your Visit',
   'Sample text. Visitor information will appear here once it is confirmed.',
   null, null, true, 1, true),
  ('visit', 'getting_here', null, 'Getting Here',
   'Sample text. Directions to the park will appear here once they are confirmed.',
   null, null, true, 2, true);

-- experiences ----------------------------------------------------------------------
insert into public.attractions
  (kind, slug, name, summary, description, icon, is_featured, is_published, sort_order, is_sample)
values
  ('experience', 'beautiful-gardens', 'Beautiful Gardens',
   'Stroll through lush gardens and vibrant blooms.', null, 'leaf', false, true, 1, true),
  ('experience', 'scenic-views', 'Scenic Views',
   'Take in sweeping views of the surrounding landscape.', null, 'mountain', false, true, 2, true),
  ('experience', 'dining', 'Dining',
   'Enjoy a meal in a relaxing garden setting.', null, 'utensils', false, true, 3, true),
  ('experience', 'relaxing-pool', 'Relaxing Pool',
   'Unwind and refresh in the pool area.', null, 'waves', false, true, 4, true);

-- attractions ------------------------------------------------------------------------
insert into public.attractions
  (kind, slug, name, summary, description, icon, is_featured, is_published, sort_order, is_sample)
values
  ('attraction', 'hilltop-viewpoint', 'Hilltop Viewpoint',
   'A place to pause and enjoy the view.',
   'Sample text. This description will be replaced with confirmed details about the attraction.',
   'mountain', true, true, 5, true),
  ('attraction', 'garden-walk', 'Garden Walk',
   'A leisurely walk among plants and flowers.',
   'Sample text. This description will be replaced with confirmed details about the attraction.',
   'flower-2', true, true, 6, true),
  ('attraction', 'picnic-grounds', 'Picnic Grounds',
   'An open space for sharing a meal outdoors.',
   'Sample text. This description will be replaced with confirmed details about the attraction.',
   'trees', true, true, 7, true),
  ('attraction', 'sunset-spot', 'Sunset Spot',
   'A quiet spot to end the day outdoors.',
   'Sample text. This description will be replaced with confirmed details about the attraction.',
   'sunset', false, true, 8, true);

-- gallery_categories --------------------------------------------------------------------
insert into public.gallery_categories (name, slug, is_published, sort_order)
values
  ('Landscapes', 'landscapes', true, 1),
  ('Gardens', 'gardens', true, 2),
  ('Facilities', 'facilities', true, 3);
