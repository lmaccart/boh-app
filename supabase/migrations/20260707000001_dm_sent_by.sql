-- Portal replies are sent as the Tarryn account; sent_by records which admin
-- actually wrote the reply (audit only, never rendered to end users).
-- Null for member-sent messages and for rows created before this migration:
-- messages previously sent under an admin's own id are left as-is.
alter table public.direct_messages
  add column sent_by uuid references public.users (id) on delete set null;

comment on column public.direct_messages.sent_by is
  'Staff member who authored a reply sent as the Tarryn account. Null for normal member messages.';

-- Tighten the portal-send policy so the audit trail is always populated:
-- staff inserting as Tarryn must record themselves in sent_by. The base
-- direct_messages_insert policy (sender_id = auth.uid()) is untouched, so
-- staff using the mobile app as regular members still DM as themselves
-- with sent_by null.
alter policy direct_messages_staff_send_as_tarryn on public.direct_messages
  with check (
    public.is_staff()
    and sent_by = (select auth.uid())
    and exists (
      select 1
      from public.users t
      where t.id = sender_id and t.role = 'tarryn'
    )
  );
