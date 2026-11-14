-- Выполнить один раз в Supabase Dashboard → SQL Editor.
create table if not exists public.portfolio_content (
  id text primary key check (id = 'main'),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;

drop policy if exists "Public can read portfolio" on public.portfolio_content;
create policy "Public can read portfolio" on public.portfolio_content for select to anon, authenticated using (true);
drop policy if exists "Signed in admins can manage portfolio" on public.portfolio_content;
create policy "Signed in admins can manage portfolio" on public.portfolio_content for all to authenticated using (true) with check (true);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-slides','portfolio-slides',true,12582912,array['image/webp','image/png','image/jpeg','image/avif'])
on conflict (id) do update set public=true,file_size_limit=12582912,allowed_mime_types=array['image/webp','image/png','image/jpeg','image/avif'];

drop policy if exists "Public can read portfolio slides" on storage.objects;
create policy "Public can read portfolio slides" on storage.objects for select to anon, authenticated using (bucket_id='portfolio-slides');
drop policy if exists "Signed in admins can add portfolio slides" on storage.objects;
create policy "Signed in admins can add portfolio slides" on storage.objects for insert to authenticated with check (bucket_id='portfolio-slides');
drop policy if exists "Signed in admins can update portfolio slides" on storage.objects;
create policy "Signed in admins can update portfolio slides" on storage.objects for update to authenticated using (bucket_id='portfolio-slides') with check (bucket_id='portfolio-slides');
drop policy if exists "Signed in admins can delete portfolio slides" on storage.objects;
create policy "Signed in admins can delete portfolio slides" on storage.objects for delete to authenticated using (bucket_id='portfolio-slides');
