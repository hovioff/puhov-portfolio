-- Replace the placeholder with the email used for your Supabase Auth account, then run once.
insert into private.portfolio_admins (user_id)
select id from auth.users
where lower(email) = lower('YOUR_SUPABASE_LOGIN_EMAIL')
on conflict (user_id) do nothing;
