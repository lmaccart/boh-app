-- Business of Happiness — pg_net triggers to invoke the notify edge function
--
-- Installs AFTER INSERT triggers on announcements, community_posts, and
-- direct_messages. Each trigger fires public.invoke_notify(), which reads
-- secret values from Vault and issues an HTTP POST to the notify edge function
-- with the exact WebhookPayload shape the function already parses.
--
-- Required Vault secrets (set once per environment, never committed):
--   notify_function_url : the URL of the deployed notify edge function
--     Production : https://<PROJECT_REF>.supabase.co/functions/v1/notify
--     Local dev  : http://kong:8000/functions/v1/notify
--   notify_service_key  : a service-role JWT or edge function bearer token
--     Obtain from Supabase Dashboard > Settings > API
--
-- To create secrets (run in SQL editor or psql):
--   select vault.create_secret('https://...', 'notify_function_url');
--   select vault.create_secret('eyJ...', 'notify_service_key');

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- pg_net ships with the local Supabase Docker stack and is always available.
create extension if not exists pg_net with schema extensions;

-- supabase_vault is available on the hosted platform. On local Docker it may
-- not exist; the trigger function handles this gracefully via an exception block.
create extension if not exists supabase_vault;

-- ---------------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------------

create or replace function public.invoke_notify()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  fn_url   text;
  auth_key text;
begin
  -- Attempt to read secrets from Vault. If the vault extension is not
  -- installed (e.g. local dev Docker image), or if the secrets have not yet
  -- been set, we fall through and return NEW without posting — no error.
  begin
    select decrypted_secret into fn_url
      from vault.decrypted_secrets
     where name = 'notify_function_url';

    select decrypted_secret into auth_key
      from vault.decrypted_secrets
     where name = 'notify_service_key';
  exception when others then
    -- Vault not available (local dev); skip the HTTP call.
    return NEW;
  end;

  if fn_url is null then
    -- Secret not yet created in this environment; skip silently.
    return NEW;
  end if;

  -- Fire-and-forget HTTP POST via pg_net. Errors are caught so a network
  -- failure never blocks the INSERT transaction.
  begin
    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || coalesce(auth_key, '')
      ),
      body    := jsonb_build_object(
        'type',       'INSERT',
        'table',      TG_TABLE_NAME,
        'schema',     TG_TABLE_SCHEMA,
        'record',     to_jsonb(NEW),
        'old_record', null::jsonb
      )
    );
  exception when others then
    -- pg_net not available or call failed; skip silently.
    null;
  end;

  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger notify_on_announcement
  after insert on public.announcements
  for each row execute function public.invoke_notify();

create trigger notify_on_community_post
  after insert on public.community_posts
  for each row execute function public.invoke_notify();

create trigger notify_on_direct_message
  after insert on public.direct_messages
  for each row execute function public.invoke_notify();
