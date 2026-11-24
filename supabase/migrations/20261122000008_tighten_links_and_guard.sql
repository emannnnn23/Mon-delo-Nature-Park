-- Tighten internal-link checks. Browsers turn "/\host" and "/<control>/host"
-- into links to other sites, so an internal link is "/" alone, or "/" followed
-- by a character that is not "/", "\" or a control character; otherwise it
-- must start with https://. The class below excludes "/", "\" and control
-- characters. Existing rows (seeded links use "/about") still satisfy it.
-- The both-or-neither (label + href) checks are separate constraints and are
-- left as they are.

-- page_sections.cta_href ------------------------------------------------------
alter table public.page_sections
  drop constraint page_sections_cta_href_check;
alter table public.page_sections
  add constraint page_sections_cta_href_check
  check (cta_href ~ '^(/([^/\\[:cntrl:]]|$)|https://)');

-- announcements.link_href -----------------------------------------------------
alter table public.announcements
  drop constraint announcements_link_href_check;
alter table public.announcements
  add constraint announcements_link_href_check
  check (link_href ~ '^(/([^/\\[:cntrl:]]|$)|https://)');
