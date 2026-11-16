-- Dashboard feed: the 10 most recently updated content rows, admin only.
-- security_invoker makes the view obey the caller's RLS on every source table;
-- the is_admin() filter on each branch returns nothing to non-admins, and the
-- grants below keep anon out entirely.
create view public.recent_content_updates
with (security_invoker = true)
as
select source, id, title, updated_at
from (
  select 'page_sections'::text as source, id, page || ' · ' || key as title, updated_at
    from public.page_sections where (select public.is_admin())
  union all
  select 'attractions', id, name, updated_at
    from public.attractions where (select public.is_admin())
  union all
  select 'gallery_images', id, coalesce(caption, 'Image'), updated_at
    from public.gallery_images where (select public.is_admin())
  union all
  select 'gallery_categories', id, name, updated_at
    from public.gallery_categories where (select public.is_admin())
  union all
  select 'testimonials', id, author_name, updated_at
    from public.testimonials where (select public.is_admin())
  union all
  select 'announcements', id, title, updated_at
    from public.announcements where (select public.is_admin())
  union all
  select 'faqs', id, question, updated_at
    from public.faqs where (select public.is_admin())
  union all
  select 'site_settings', id, 'Contact & settings', updated_at
    from public.site_settings where (select public.is_admin())
) as recent
order by updated_at desc
limit 10;

revoke all on public.recent_content_updates from anon, authenticated;
grant select on public.recent_content_updates to authenticated;
