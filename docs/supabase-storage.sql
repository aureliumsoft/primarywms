-- Run in Supabase → SQL Editor (anon key cannot create buckets).
-- Dashboard → Storage also works: create a public bucket named `primarywms`.

insert into storage.buckets (id, name, public, file_size_limit)
values ('primarywms', 'primarywms', true, 31457280)
on conflict (id) do update set public = true, file_size_limit = 31457280;

drop policy if exists "primarywms public read" on storage.objects;
create policy "primarywms public read"
on storage.objects for select
using (bucket_id = 'primarywms');

drop policy if exists "primarywms uploads" on storage.objects;
create policy "primarywms uploads"
on storage.objects for insert
with check (bucket_id = 'primarywms');

drop policy if exists "primarywms updates" on storage.objects;
create policy "primarywms updates"
on storage.objects for update
using (bucket_id = 'primarywms');

drop policy if exists "primarywms deletes" on storage.objects;
create policy "primarywms deletes"
on storage.objects for delete
using (bucket_id = 'primarywms');
