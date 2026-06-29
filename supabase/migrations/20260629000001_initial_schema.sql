-- Business of Happiness — initial schema (v0)
-- Full DB foundation: enums, 13 tables, profile-sync trigger, helper functions,
-- indexes, and Row Level Security with baseline policies.
-- RLS policies are intentionally conservative for v0 and will be refined as v1
-- features (community feeds, DMs, resources) are built out.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('user', 'admin', 'tarryn');
create type public.section_type as enum ('welcome', 'nsr', 'meditation', 'module', 'live');
create type public.resource_type as enum ('pdf', 'audio');
create type public.favorite_content_type as enum ('clip', 'audio', 'pdf', 'lesson');
create type public.device_platform as enum ('ios', 'android');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- App user profiles, mirrored from auth.users (see handle_new_user trigger).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date,
  created_at timestamptz not null default now()
);

-- Many-to-many access control: which users can access which courses.
create table public.course_whitelist (
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  type public.section_type not null,
  title text not null,
  "order" integer not null default 0,
  go_live_date timestamptz,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections (id) on delete cascade,
  title text not null,
  video_url text,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type public.resource_type not null,
  url text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position_seconds numeric not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  content_type public.favorite_content_type not null,
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

-- course_id null => the app-wide "Business of Happiness" feed.
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  body text,
  media_url text,
  created_at timestamptz not null default now()
);

create table public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  body text,
  media_url text,
  created_at timestamptz not null default now()
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- course_id null => app-wide announcement.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete cascade,
  body text not null,
  posted_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token text not null,
  platform public.device_platform not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- ---------------------------------------------------------------------------
-- Profile sync: create a public.users row whenever an auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer to avoid recursive policy checks).
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid()) and u.role in ('admin', 'tarryn')
  );
$$;

create or replace function public.is_whitelisted(course uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_whitelist w
    where w.user_id = (select auth.uid()) and w.course_id = course
  );
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_course_whitelist_user on public.course_whitelist (user_id);
create index idx_course_sections_course on public.course_sections (course_id);
create index idx_lessons_section on public.lessons (section_id);
create index idx_lesson_resources_lesson on public.lesson_resources (lesson_id);
create index idx_user_progress_user on public.user_progress (user_id);
create index idx_favorites_user on public.favorites (user_id);
create index idx_community_posts_course on public.community_posts (course_id);
create index idx_community_posts_created on public.community_posts (created_at desc);
create index idx_post_replies_post on public.post_replies (post_id);
create index idx_direct_messages_sender on public.direct_messages (sender_id);
create index idx_direct_messages_recipient on public.direct_messages (recipient_id);
create index idx_announcements_course on public.announcements (course_id);
create index idx_push_tokens_user on public.push_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.course_whitelist enable row level security;
alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.user_progress enable row level security;
alter table public.favorites enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_replies enable row level security;
alter table public.direct_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.push_tokens enable row level security;

-- users: read/update your own profile; staff can read all. Inserts happen via
-- the security-definer trigger, so no insert policy is needed.
create policy users_select_self on public.users
  for select using ((select auth.uid()) = id or public.is_staff());
create policy users_update_self on public.users
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- courses + structure: visible to whitelisted users and staff.
create policy courses_select on public.courses
  for select using (public.is_whitelisted(id) or public.is_staff());

create policy course_whitelist_select on public.course_whitelist
  for select using (user_id = (select auth.uid()) or public.is_staff());

create policy course_sections_select on public.course_sections
  for select using (public.is_whitelisted(course_id) or public.is_staff());

create policy lessons_select on public.lessons
  for select using (
    exists (
      select 1 from public.course_sections s
      where s.id = section_id and (public.is_whitelisted(s.course_id) or public.is_staff())
    )
  );

create policy lesson_resources_select on public.lesson_resources
  for select using (
    exists (
      select 1
      from public.lessons l
      join public.course_sections s on s.id = l.section_id
      where l.id = lesson_id and (public.is_whitelisted(s.course_id) or public.is_staff())
    )
  );

-- user_progress + favorites: strictly per-user.
create policy user_progress_all on public.user_progress
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy favorites_all on public.favorites
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- community: app-wide feed readable by all authenticated; course feeds gated.
create policy community_posts_select on public.community_posts
  for select using (
    course_id is null or public.is_whitelisted(course_id) or public.is_staff()
  );
create policy community_posts_insert on public.community_posts
  for insert with check (
    user_id = (select auth.uid())
    and (course_id is null or public.is_whitelisted(course_id) or public.is_staff())
  );
create policy community_posts_modify on public.community_posts
  for update using (user_id = (select auth.uid()) or public.is_staff());
create policy community_posts_delete on public.community_posts
  for delete using (user_id = (select auth.uid()) or public.is_staff());

create policy post_replies_select on public.post_replies
  for select using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id
        and (p.course_id is null or public.is_whitelisted(p.course_id) or public.is_staff())
    )
  );
create policy post_replies_insert on public.post_replies
  for insert with check (user_id = (select auth.uid()));
create policy post_replies_delete on public.post_replies
  for delete using (user_id = (select auth.uid()) or public.is_staff());

-- direct_messages: only the two participants can read; only the sender writes.
create policy direct_messages_select on public.direct_messages
  for select using (
    sender_id = (select auth.uid()) or recipient_id = (select auth.uid())
  );
create policy direct_messages_insert on public.direct_messages
  for insert with check (sender_id = (select auth.uid()));

-- announcements: app-wide visible to all authenticated; course-scoped gated.
-- Only staff create/modify.
create policy announcements_select on public.announcements
  for select using (
    course_id is null or public.is_whitelisted(course_id) or public.is_staff()
  );
create policy announcements_write on public.announcements
  for all using (public.is_staff()) with check (public.is_staff());

-- push_tokens: strictly per-user.
create policy push_tokens_all on public.push_tokens
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
