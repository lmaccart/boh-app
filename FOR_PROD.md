# Remaining before store submission

Status as of 2026-08-07: Tasks 1-4, 6, 7, 8 of
`docs/superpowers/plans/2026-07-14-launch-readiness.md` are done. Two remain.

## Task 5: Set Supabase secrets and deploy edge functions — BLOCKED ON USER

Not started. Blocked on inputs only the user has:

- [ ] FunnelBreezy inbound-webhook URL for the reach-out-email workflow (no
      public API — this is a per-workflow URL from the FunnelBreezy dashboard)
- [ ] A verified Resend sender address/domain
- [ ] Confirmation of whether `RESEND_API_KEY` is already set as a Supabase
      secret, or still needs to be added

Once those are known:
1. Confirm `supabase login` session is valid (`supabase projects list` —
   already confirmed working 2026-08-07, may still be valid)
2. Show the user the exact commands before running anything remote
   (STANDING RULE: explicit approval required before any deploy to the
   remote Supabase project — see memory `test-against-remote-supabase`):
   - `supabase secrets set EMAIL_PROVIDER=funnelbreezy FUNNELBREEZY_WEBHOOK_URL=<url> RESEND_API_KEY=<key> RESEND_FROM=<verified address>`
   - `supabase functions deploy reach-out-email`
   - `supabase functions deploy notify`
3. Verify: `supabase secrets list` shows all four; `supabase functions list`
   shows both ACTIVE with today's deploy date
4. Live smoke check: user sends a Reach Out message from the app, confirms
   email arrives at both tarryn@drtarrynmaccarthy.com and
   hereforyou@drtarrynmaccarthy.com
5. Rollback path if FunnelBreezy misbehaves: `supabase secrets set EMAIL_PROVIDER=resend`
   (read per-request, no redeploy needed)

## Task 9: Production builds and launch verification — BLOCKED ON TASK 5

Not started; needs Task 5 done first. Then:

- [ ] `eas build --platform ios --profile production` and
      `eas build --platform android --profile production` — both green
      (first run is interactive, user drives Apple/Android credential prompts)
- [ ] Download the .ipa, unzip, `codesign -d --entitlements - <extracted .app>`
      — confirm `aps-environment=production` (committed entitlements file
      says development; distribution signing must swap it)
- [ ] TestFlight (iOS) / Play internal testing (Android) with two real
      accounts, on real devices:
  - [ ] Sign-in works on both platforms
  - [ ] A DM from another account produces a push notification (app backgrounded)
  - [ ] Reach Out Here produces an email at both drtarrynmaccarthy.com addresses
  - [ ] An announcement posted from https://boh-admin.vercel.app produces a
        push on both devices
- [ ] Do not submit for store review with any of the above failing

## App store submission (not yet a plan task — do after Task 9 is green)

- [ ] App Store Connect: create the app record, upload screenshots, set
      privacy nutrition labels (accounts, user content, photos/videos), link
      privacy policy at https://thebizofhappiness.com/legal/#privacy
- [ ] Play Console: create the app, complete the Data safety form, upload
      assets

## Post-launch (explicitly deferred, not blocking)

- [ ] Implement social SSO (deferred 2026-07-14 by owner decision — see
      REQUIREMENTS.md)
- [ ] Watch FunnelBreezy email delivery; flip `EMAIL_PROVIDER=resend` if it
      misbehaves
