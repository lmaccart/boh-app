# Remaining before store submission

- Set Supabase secrets and deploy edge functions (EMAIL_PROVIDER=funnelbreezy,
  FUNNELBREEZY_WEBHOOK_URL, RESEND_FROM on a verified Resend domain), with
  explicit approval before any remote deploy
- Link the EAS project (eas init) and set up Android: Firebase
  google-services.json, expo prebuild, FCM V1 service-account key in Expo
- Deploy boh-admin to static hosting and add its URLs (http://localhost:5173
  dev + prod domain) to Supabase Auth redirect URLs
- App Store Connect: create the app record, upload screenshots, set the privacy
  nutrition labels (accounts, user content, photos/videos), link the privacy
  policy at https://thebizofhappiness.com/legal/#privacy
- Play Console: create the app, complete the Data safety form, upload assets
- Confirm the production iOS build carries aps-environment=production
- Post-launch: implement social SSO (deferred 2026-07-14); flip EMAIL_PROVIDER
  back to resend if FunnelBreezy routing misbehaves
