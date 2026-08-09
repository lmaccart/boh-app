# Remaining before store submission

Status as of 2026-08-08: Tasks 1-4, 6, 7, 8 of
`docs/superpowers/plans/2026-07-14-launch-readiness.md` are done. Task 5 is
done in its v1 form (see `docs/superpowers/plans/2026-08-08-v1-no-email-provider.md`
— Reach Out Here ships in-app only for v1, no email provider configured).
One task remains.

## Task 9: Production builds and launch verification

Not started. Needs:

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
  - [ ] Reach Out Here message appears in the admin/Tarryn in-app inbox
        (no email is sent for v1 — this is expected, see REQUIREMENTS.md)
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
- [ ] Add an email provider for Reach Out Here (deferred 2026-08-08 by owner
      decision — see REQUIREMENTS.md). To enable: `supabase secrets set
      EMAIL_PROVIDER=resend` (Resend secrets are already set, just dormant) or
      `EMAIL_PROVIDER=funnelbreezy` plus `FUNNELBREEZY_WEBHOOK_URL`; no
      redeploy needed, env is read per-request.
