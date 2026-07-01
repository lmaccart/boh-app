-- Business of Happiness — table grants for `authenticated` (v1 fix)
-- RLS policies filter *rows*, but Postgres also requires the coarser
-- table-level privilege before a policy is even consulted. The v0 migration
-- enabled RLS and added policies for these tables but never granted the
-- matching privileges, so every query failed with "permission denied for
-- table ..." instead of being row-filtered by the policies. Grants below
-- mirror exactly what each table's existing policies already allow.

-- read-only for members; writes happen via security-definer trigger or admin tooling
grant select, update on public.users to authenticated;
grant select on public.courses to authenticated;
grant select on public.course_whitelist to authenticated;
grant select on public.course_sections to authenticated;
grant select on public.lessons to authenticated;
grant select on public.lesson_resources to authenticated;

-- strictly per-user, full CRUD via "for all" policies
grant select, insert, update, delete on public.user_progress to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

-- community: full CRUD, RLS restricts to own rows or staff
grant select, insert, update, delete on public.community_posts to authenticated;

-- replies: no update policy defined, so no update grant
grant select, insert, delete on public.post_replies to authenticated;

-- DMs: append-only from the client, no update/delete policy defined
grant select, insert on public.direct_messages to authenticated;

-- announcements: select for all whitelisted/staff members; insert/update/delete
-- gated to staff by the announcements_write policy's is_staff() check
grant select, insert, update, delete on public.announcements to authenticated;
