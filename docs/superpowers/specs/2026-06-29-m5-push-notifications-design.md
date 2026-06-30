# M5: Push Notifications + Reach-Out Email

**Date:** 2026-06-29
**Scope:** Wire push token registration, add `notify` and `reach-out-email` Supabase Edge Functions, configure database webhooks.

---

## 1. Push Registration

### What it does
Registers the device's Expo push token with Supabase on login so Edge Functions can deliver notifications later.

### Implementation
Add a `PushRegistrar` component (renders `null`) to `app/_layout.tsx`, rendered only when `session` is non-null. On mount it:
1. Calls `registerForPushNotifications()` from `src/lib/push.ts` — requests permission, returns `{ token, platform }` or `null` if denied/simulator.
2. If a token is returned, fires `useRegisterPushToken()` mutation (already in `src/api/notifications.ts`) which upserts into `push_tokens` on `(user_id, token)`.

No UI or loading state needed. Re-registration is idempotent.

---

## 2. `notify` Edge Function

**Path:** `supabase/functions/notify/index.ts`
**Trigger:** Database webhooks on `community_posts` INSERT and `direct_messages` INSERT.

### Webhook payload shape
```json
{
  "type": "INSERT",
  "table": "community_posts" | "direct_messages",
  "schema": "public",
  "record": { ...row fields... },
  "old_record": null
}
```

### community_posts path
1. Look up `record.user_id` in `users` — if role is not `admin` or `tarryn`, return 200 (no-op).
2. Determine audience:
   - `record.course_id` is null → all users (global Business of Happiness feed)
   - `record.course_id` is set → all `user_id`s in `course_whitelist` for that course
3. Fetch `push_tokens` for those users.
4. Send push batch to Expo API.

Notification copy (poster's name looked up from `users`):
- **Title:** Poster's name
- **Body:** First 100 chars of `record.body`, or `New video posted` if body is null and `record.media_url` is set.

### direct_messages path
1. Fetch `push_tokens` for `record.recipient_id`.
2. Look up sender name from `users` for notification title.
3. Send push batch to Expo API.

Notification copy:
- **Title:** Sender's name
- **Body:** First 100 chars of `record.body`

### Expo Push API
- Endpoint: `https://exp.host/--/api/v2/push/send`
- No API key required.
- Batch size: max 100 tokens per request (Expo limit). Split into chunks if needed.
- Non-fatal errors (bad token, device not registered): log and continue. Do not throw.

### Auth
Uses `SUPABASE_SERVICE_ROLE_KEY` (auto-available in Edge Functions) to bypass RLS on `users`, `course_whitelist`, and `push_tokens`.

### Error handling
Always returns HTTP 200 so Supabase does not retry. Errors are logged to stderr.

---

## 3. `reach-out-email` Edge Function

**Path:** `supabase/functions/reach-out-email/index.ts`
**Trigger:** Database webhook on `direct_messages` INSERT.

### Logic
1. Look up `record.recipient_id` in `users`.
2. If role is not `admin` or `tarryn`, return 200 (no-op).
3. Look up sender name from `users` by `record.sender_id`.
4. Call Resend API to send email.

### Email
- **To:** `tarryn@drtarrynmaccarthy.com`, `hereforyou@drtarrynmaccarthy.com`
- **From:** `RESEND_FROM` env var (e.g. `notifications@thebizofhappiness.com` — must be a verified Resend domain)
- **Subject:** `New message from [Sender Name]`
- **Text body:**
  ```
  [Sender Name] sent you a message via the Business of Happiness app:

  "[message body]"

  Reply in the app to respond.
  ```

### Resend API
- Endpoint: `https://api.resend.com/emails`
- Auth: `Authorization: Bearer $RESEND_API_KEY`

### Error handling
Same as `notify` — log errors, always return 200.

---

## 4. Database Webhooks

Webhooks are configured manually in the Supabase Dashboard (Database → Webhooks). Three webhooks are needed:

| Name | Table | Event | Target Function |
|---|---|---|---|
| `notify-community` | `community_posts` | INSERT | `notify` |
| `notify-dm` | `direct_messages` | INSERT | `notify` |
| `reach-out-dm` | `direct_messages` | INSERT | `reach-out-email` |

Each webhook POSTs to:
```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```
With header:
```
Authorization: Bearer <service-role-key>
```

---

## 5. Secrets

Set once via Supabase CLI:
```bash
supabase secrets set RESEND_API_KEY=<key>
supabase secrets set RESEND_FROM=notifications@thebizofhappiness.com
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the Supabase runtime.

---

## 6. Files Changed

| File | Action |
|---|---|
| `app/_layout.tsx` | Add `PushRegistrar` component |
| `supabase/functions/notify/index.ts` | Create |
| `supabase/functions/reach-out-email/index.ts` | Create |

No new migrations required. `push_tokens` table and all referenced tables already exist in `20260629000001_initial_schema.sql`.
