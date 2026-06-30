# Configuring Push Notifications and Resend Email

## 1. Deploy Edge Functions

```bash
supabase functions deploy notify --no-verify-jwt
supabase functions deploy reach-out-email --no-verify-jwt
```

Both commands should print `Deployed` with a function URL.

## 2. Set Secrets

```bash
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
supabase secrets set RESEND_FROM=notifications@thebizofhappiness.com
supabase secrets list
```

Get your API key from [resend.com/api-keys](https://resend.com/api-keys). `RESEND_FROM` must use a domain verified in Resend. If `thebizofhappiness.com` is not yet verified, use `onboarding@resend.dev` for testing (sends only to your own email).

## 3. Create Database Webhooks

In Supabase Dashboard → Database → Webhooks → Create webhook:

| Name | Table | Event | Edge Function |
|---|---|---|---|
| `notify-community` | `public.community_posts` | INSERT | `notify` |
| `notify-dm` | `public.direct_messages` | INSERT | `notify` |
| `reach-out-dm` | `public.direct_messages` | INSERT | `reach-out-email` |

All three webhooks should show status **Active** after creation.

## 4. Smoke Tests

**Push notifications:** Log in on two devices. On an admin/Tarryn account, post to the community. The other device should receive a push notification within a few seconds.

**Email forwarding:** On a regular user account, go to DMs → tap **Reach Out Here** → send a message. Confirm:
- `tarryn@drtarrynmaccarthy.com` receives the email
- `hereforyou@drtarrynmaccarthy.com` receives the email
- Subject is `New message from [User Name]`
- Body contains the message text and "Reply in the app to respond."

Check Edge Function logs in Supabase Dashboard → Edge Functions → (function name) → Logs if anything doesn't arrive.
