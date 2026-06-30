-- Business of Happiness — storage buckets (v1)
-- Media for community posts/replies/DMs and user avatars. Buckets are public
-- read (URLs are unguessable UUID paths); writes are restricted to the owning
-- user's own top-level folder, named by their auth uid.

insert into storage.buckets (id, name, public)
values
  ('community-media', 'community-media', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Authenticated users may upload into a folder named after their own uid:
--   community-media/<auth.uid()>/<file>
create policy "Users upload own community media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own community media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own community media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
