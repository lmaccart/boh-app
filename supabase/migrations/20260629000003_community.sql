-- Business of Happiness — community/DM enablement (v1)
-- The v0 users policy only lets a user read their own row, which prevents the
-- community feed, DM partner names, and the Tarryn lookup from resolving other
-- members. Rather than broadening access to the users table (which would expose
-- email), expose a narrow read-only profiles view that omits email and bypasses
-- the users RLS via its owner privileges.

create view public.profiles
  with (security_invoker = off)
  as select id, name, avatar_url, role from public.users;

-- Authenticated members may read public profile fields of other members.
grant select on public.profiles to authenticated;

-- Realtime: stream new posts, replies, and direct messages to subscribed
-- clients so feeds and DM threads update live.
alter publication supabase_realtime add table public.community_posts;
alter publication supabase_realtime add table public.post_replies;
alter publication supabase_realtime add table public.direct_messages;
