-- Business of Happiness — persisted read/unread state for direct messages
-- Adds a read_at timestamp to direct_messages so the admin inbox can track
-- which inbound messages have been seen, replacing the "latest sender" heuristic.

alter table public.direct_messages
  add column read_at timestamptz;

-- Staff need UPDATE privilege; direct_messages previously had only select/insert.
grant update on public.direct_messages to authenticated;

-- Allow staff to mark inbound messages (where they are the recipient) as read.
-- Uses the same is_staff() / is_staff_user() helpers established in the
-- admin_portal migration.
create policy direct_messages_staff_update_read_at on public.direct_messages
  for update using (
    public.is_staff()
    and public.is_staff_user(recipient_id)
  )
  with check (
    public.is_staff()
    and public.is_staff_user(recipient_id)
  );
