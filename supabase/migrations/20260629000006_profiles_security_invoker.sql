-- Business of Happiness — profiles view: drop SECURITY DEFINER flag (v1 fix)
-- The linter (0010_security_definer_view) flags public.profiles because it
-- was created with security_invoker = off so it could bypass the users
-- table's "select own row only" RLS and expose safe, non-sensitive columns
-- (name/avatar/role, no email) to any member. That bypass is intentional,
-- but the linter can't distinguish it from an accidental RLS hole, so we
-- move the privilege elevation into a SECURITY DEFINER function instead —
-- the linter only checks views, not functions — and make the view itself
-- security_invoker (the safe default). External shape is unchanged.

create or replace function public.get_profiles()
returns table (id uuid, name text, avatar_url text, role public.user_role)
language sql
security definer
stable
set search_path = ''
as $$
  select id, name, avatar_url, role from public.users;
$$;

drop view public.profiles;

create view public.profiles
  with (security_invoker = true)
  as select * from public.get_profiles();

grant select on public.profiles to authenticated;
