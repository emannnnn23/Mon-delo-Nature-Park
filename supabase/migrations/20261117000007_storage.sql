-- Media storage: one public bucket, admin-only writes.
-- The bucket is public, so files are served by URL with no select policy for
-- anon. Listing and managing objects through the API is admin-only. Every
-- policy is scoped to bucket_id = 'media' so other buckets are unaffected.
-- storage.objects grants are Supabase-managed and left untouched.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy media_objects_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy media_objects_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy media_objects_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy media_objects_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
