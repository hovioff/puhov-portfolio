create table if not exists public.portfolio_content (
  id text primary key check (id = 'main'),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
revoke all on public.portfolio_content from public, anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;

-- Only the explicitly allow-listed Supabase user can change portfolio data.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create table if not exists private.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.portfolio_admins enable row level security;
revoke all on table private.portfolio_admins from public, anon, authenticated;
create or replace function private.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.portfolio_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_portfolio_admin() from public, anon, authenticated;
grant execute on function private.is_portfolio_admin() to authenticated;

create table if not exists public.promo_cards (
  id text primary key,
  payload jsonb not null,
  position integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.promo_cards enable row level security;
revoke all on public.promo_cards from public, anon, authenticated;
grant select on public.promo_cards to anon, authenticated;
grant insert, update, delete on public.promo_cards to authenticated;
drop policy if exists "Public can read promo cards" on public.promo_cards;
create policy "Public can read promo cards" on public.promo_cards for select to anon, authenticated using (true);
drop policy if exists "Signed in admins can manage promo cards" on public.promo_cards;
create policy "Signed in admins can manage promo cards" on public.promo_cards for all to authenticated using ((select private.is_portfolio_admin())) with check ((select private.is_portfolio_admin()));
insert into public.promo_cards (id,payload,position,active)
select card->>'id',card,ordinality::integer-1,coalesce((card->>'active')::boolean,true)
from public.portfolio_content p cross join lateral jsonb_array_elements(coalesce(p.payload->'promoCards','[]'::jsonb)) with ordinality as cards(card,ordinality)
where p.id='main' and card->>'id' is not null
on conflict (id) do nothing;


drop policy if exists "Public can read portfolio" on public.portfolio_content;
create policy "Public can read portfolio" on public.portfolio_content for select to anon, authenticated using (true);
drop policy if exists "Signed in admins can manage portfolio" on public.portfolio_content;
create policy "Signed in admins can manage portfolio" on public.portfolio_content for all to authenticated using ((select private.is_portfolio_admin())) with check ((select private.is_portfolio_admin()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-slides','portfolio-slides',true,12582912,array['image/webp','image/png','image/jpeg','image/avif'])
on conflict (id) do update set public=true,file_size_limit=12582912,allowed_mime_types=array['image/webp','image/png','image/jpeg','image/avif'];

drop policy if exists "Public can read portfolio slides" on storage.objects;
create policy "Public can read portfolio slides" on storage.objects for select to anon, authenticated using (bucket_id='portfolio-slides');
drop policy if exists "Signed in admins can add portfolio slides" on storage.objects;
create policy "Signed in admins can add portfolio slides" on storage.objects for insert to authenticated with check (bucket_id='portfolio-slides' and (select private.is_portfolio_admin()));
drop policy if exists "Signed in admins can update portfolio slides" on storage.objects;
create policy "Signed in admins can update portfolio slides" on storage.objects for update to authenticated using (bucket_id='portfolio-slides' and (select private.is_portfolio_admin())) with check (bucket_id='portfolio-slides' and (select private.is_portfolio_admin()));
drop policy if exists "Signed in admins can delete portfolio slides" on storage.objects;
create policy "Signed in admins can delete portfolio slides" on storage.objects for delete to authenticated using (bucket_id='portfolio-slides' and (select private.is_portfolio_admin()));
