-- Promo cards setup for Supabase SQL Editor.
-- Safe to run even when the portfolio's private schema/admin function is not installed yet.

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
    select 1
    from private.portfolio_admins
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
create policy "Public can read promo cards"
on public.promo_cards for select to anon, authenticated using (true);

drop policy if exists "Signed in admins can manage promo cards" on public.promo_cards;
create policy "Signed in admins can manage promo cards"
on public.promo_cards for all to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));

-- Add the email used to sign in to the admin panel.
-- Replace the value below, then run this command once.
insert into private.portfolio_admins (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (user_id) do nothing;

insert into public.promo_cards (id, payload, position, active)
select card->>'id', card, ordinality::integer - 1,
       coalesce((card->>'active')::boolean, true)
from public.portfolio_content p
cross join lateral jsonb_array_elements(
  coalesce(p.payload->'promoCards', '[]'::jsonb)
) with ordinality as cards(card, ordinality)
where p.id = 'main' and card->>'id' is not null
on conflict (id) do nothing;
