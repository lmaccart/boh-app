-- Business of Happiness — admin portal foundation (admin v0)
-- Staff (admin/tarryn) write access to course structure and the whitelist,
-- staff visibility into Reach Out DMs, reply-as-Tarryn, and the
-- course-content storage bucket for lesson media.
--
-- Already covered by the initial schema — deliberately NOT re-added here:
--   announcements_write (staff full write), community_posts_delete,
--   post_replies_delete, community_posts_modify (staff moderation).

-- ---------------------------------------------------------------------------
-- Helper: is an arbitrary user id staff? Security definer so policies on
-- other tables can check roles without tripping users-table RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff_user(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid and u.role in ('admin', 'tarryn')
  );
$$;

-- ---------------------------------------------------------------------------
-- Course structure + whitelist: staff manage everything. Select policies
-- already exist; `for all` permissive policies simply OR with them (same
-- pattern as announcements_write).
-- ---------------------------------------------------------------------------
create policy courses_staff_write on public.courses
  for all using (public.is_staff()) with check (public.is_staff());

create policy course_sections_staff_write on public.course_sections
  for all using (public.is_staff()) with check (public.is_staff());

create policy lessons_staff_write on public.lessons
  for all using (public.is_staff()) with check (public.is_staff());

create policy lesson_resources_staff_write on public.lesson_resources
  for all using (public.is_staff()) with check (public.is_staff());

create policy course_whitelist_staff_write on public.course_whitelist
  for all using (public.is_staff()) with check (public.is_staff());

-- RLS filters rows, but Postgres also requires table-level privileges before
-- policies are consulted (see 20260629000004_grants.sql for the history).
grant insert, update, delete on public.courses to authenticated;
grant insert, update, delete on public.course_sections to authenticated;
grant insert, update, delete on public.lessons to authenticated;
grant insert, update, delete on public.lesson_resources to authenticated;
grant insert, update, delete on public.course_whitelist to authenticated;

-- ---------------------------------------------------------------------------
-- Reach Out inbox: staff can read any DM involving a staff participant
-- (user -> Tarryn messages and Tarryn -> user replies) without exposing
-- user <-> user private conversations.
-- ---------------------------------------------------------------------------
create policy direct_messages_staff_select on public.direct_messages
  for select using (
    public.is_staff()
    and (public.is_staff_user(sender_id) or public.is_staff_user(recipient_id))
  );

-- Portal replies are sent as the designated Tarryn account so the user always
-- sees "Tarryn", regardless of which admin replied. The users subquery runs
-- as the staff caller, who can read all user rows (users_select_self).
create policy direct_messages_staff_send_as_tarryn on public.direct_messages
  for insert with check (
    public.is_staff()
    and exists (
      select 1
      from public.users t
      where t.id = sender_id and t.role = 'tarryn'
    )
  );

-- select + insert on direct_messages were already granted to authenticated.

-- ---------------------------------------------------------------------------
-- course-content bucket: lesson videos, audio, and PDFs uploaded from the
-- admin portal. Public read via unguessable UUID paths (same rationale as
-- community-media); writes are staff-only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-content', 'course-content', true)
on conflict (id) do nothing;

create policy "Staff upload course content"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-content' and public.is_staff());

create policy "Staff update course content"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-content' and public.is_staff());

create policy "Staff delete course content"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-content' and public.is_staff());
