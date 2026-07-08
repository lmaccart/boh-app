- Change `RESEND_FROM` env var to use a verified Resend domain
  - Update the emails in supabase/functions/reach-out-email/index.ts to send to both of tarryn's emails
  - get api key for funnelbreezy and add using supabase secrets set FUNNELBREEZY_WEBHOOK_URL=https://your-actual-url
- Add the admin portal URLs to Supabase Auth -> URL Configuration -> Redirect URLs:
  - `http://localhost:5173` (dev)
  - the deployed boh-admin domain (prod)
1. Swap reach-out email recipients to the real addresses — supabase/functions/reach-out-email/index.ts:4 currently sends to leif@lmgroup.dev with Tarryn's two addresses commented out — and set RESEND_FROM to a verified Resend domain.
2. Set the FUNNELBREEZY_WEBHOOK_URL secret (workflow inbound-webhook URL) and decide when to flip EMAIL_PROVIDER from Resend to FunnelBreezy.
3. Add the admin portal URLs (localhost:5173 dev + prod domain) to Supabase Auth redirect URLs.
4. Deploy boh-admin to static hosting (Vercel/Netlify/CF Pages) — there's no deploy config in the repo yet.
5. Deploy migrations and edge functions to the remote Supabase project (per your standing note: with explicit approval, verified against prod rather than Docker)
