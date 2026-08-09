# Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every gap found in the pre-launch repo sweep so the Business of Happiness app can ship to the App Store and Play Store with working push notifications, correct email routing, and a deployed admin portal.

**Architecture:** The mobile app (Expo 56 bare workflow, iOS project committed) talks to the remote Supabase project `rvznhgubzjublttmqudh`. Two Deno edge functions (`notify`, `reach-out-email`) fan out push notifications and reach-out emails. The admin portal (`boh-admin`, Vite SPA) deploys to static hosting. This plan is mostly configuration and deployment work plus one small code change; app features are already implemented.

**Tech Stack:** Expo 56 / React Native 0.85, EAS Build, Supabase (Postgres, Auth, Edge Functions), Expo Push Service (APNs + FCM V1), FunnelBreezy inbound webhooks, Resend (fallback), Vite + Vercel for boh-admin.

**User decisions (already made):**
- Social SSO is deferred post-launch; the app launches with email/password auth. This is an approved deviation from REQUIREMENTS.md ("Supabase Auth with social SSO"), consented 2026-07-14.
- Both iOS and Android ship at launch (Android native project, FCM push, and Play Store setup are in scope).
- Production email path is FunnelBreezy (`EMAIL_PROVIDER=funnelbreezy`); Resend stays configured as fallback. **Superseded 2026-08-08:** v1 ships with no email provider at all — see `docs/superpowers/plans/2026-08-08-v1-no-email-provider.md`.
- Standing instruction (memory): anything that deploys to the remote Supabase project requires explicit user approval before the command is run.

**Sweep findings this plan fixes:**
1. `supabase/functions/reach-out-email/index.ts:4-8` — recipients are `leif@lmgroup.dev`; Tarryn's two addresses are commented out.
2. `app.json` — no `extra.eas.projectId`, so `getExpoPushTokenAsync` in `src/lib/push.ts:42-46` silently returns null in production builds; push registration never happens. Also `version: "0.0.0"` and no root `icon`.
3. No `android/` project, no adaptive icon, no `google-services.json`, no FCM credentials — Android cannot build or receive push.
4. `eas.json` production profile has no `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`, so a production EAS build would crash at startup (`src/lib/supabase.ts:12-17` throws when they are missing).
5. Supabase secrets `EMAIL_PROVIDER`, `FUNNELBREEZY_WEBHOOK_URL`, `RESEND_FROM` not set for production; edge function deployment state unverified (CLI not logged in; migrations ARE in sync with remote).
6. Supabase Auth redirect URLs missing for the admin portal (localhost:5173 dev + prod domain).
7. `boh-admin` has no deploy config and is not hosted anywhere.
8. REQUIREMENTS.md still requires social SSO; the approved deviation is unrecorded. `FOR_PROD.md` is stale.
9. iOS entitlements pin `aps-environment: development` — must verify the distribution build carries `production`.

---

### Task 1: Point reach-out emails at Tarryn's real addresses

**Goal:** The `reach-out-email` edge function sends to `tarryn@drtarrynmaccarthy.com` and `hereforyou@drtarrynmaccarthy.com` instead of the developer address.

**Files:**
- Modify: `supabase/functions/reach-out-email/index.ts:4-8`

**Acceptance Criteria:**
- [ ] `TO_ADDRESSES` contains exactly the two drtarrynmaccarthy.com addresses
- [ ] `leif@lmgroup.dev` no longer appears anywhere in `supabase/`
- [ ] File still parses (Deno-style TS; no syntax errors)

**Verify:** `grep -c 'drtarrynmaccarthy.com' supabase/functions/reach-out-email/index.ts` → `2`, and `grep -rn 'lmgroup' supabase/` → no output

**Steps:**

- [ ] **Step 1: Edit the recipient list**

Replace lines 4-8 of `supabase/functions/reach-out-email/index.ts`:

```ts
const TO_ADDRESSES = [
  "tarryn@drtarrynmaccarthy.com",
  "hereforyou@drtarrynmaccarthy.com",
];
```

(The commented-out addresses and `leif@lmgroup.dev` are all removed.)

- [ ] **Step 2: Verify**

Run: `grep -c 'drtarrynmaccarthy.com' supabase/functions/reach-out-email/index.ts`
Expected: `2`

Run: `grep -rn 'lmgroup' supabase/`
Expected: no output (exit code 1)

If `deno` is installed, also run: `deno check supabase/functions/reach-out-email/index.ts` → no errors. If deno is not installed, skip; the edit is a string-literal swap.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/reach-out-email/index.ts
git commit -m "fix(email): send reach-out emails to Tarryn's real addresses"
```

Note: deployment of this function happens in Task 5 (requires user approval).

---

### Task 2: EAS project link + store-ready app config

**Goal:** `app.json` carries an EAS `projectId` (so push tokens work in production builds), a real version, and a root icon asset usable by Android prebuild.

**Files:**
- Modify: `app.json`
- Create: `assets/icon.png` (copied from the existing iOS 1024px icon)

**Acceptance Criteria:**
- [ ] `npx expo config --type public` output contains `extra.eas.projectId` with a UUID
- [ ] `expo.version` is `"1.0.0"`
- [ ] `assets/icon.png` exists and `expo.icon` points to it
- [ ] `npm run typecheck` and `npm test` still pass (no app code touched, sanity check)

**Verify:** `npx expo config --json | python3 -c "import json,sys; c=json.load(sys.stdin); print(c['version'], c['extra']['eas']['projectId'], c['icon'])"` → `1.0.0 <uuid> ./assets/icon.png`

**Steps:**

- [ ] **Step 1: Log in to Expo and create/link the EAS project**

`eas init` is interactive and account-bound. Ask the user to run it themselves in this session:

```
! npx eas-cli whoami || npx eas-cli login
! npx eas-cli init
```

`eas init` writes `extra.eas.projectId` (and `owner`) into `app.json` automatically. Do not hand-write a projectId.

- [ ] **Step 2: Copy the existing 1024px icon to a root asset**

```bash
mkdir -p assets
cp "ios/BusinessofHappiness/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png" assets/icon.png
```

- [ ] **Step 3: Edit app.json**

Set the version and root icon (top-level keys inside `"expo"`, alongside the `extra` block `eas init` added):

```json
{
  "expo": {
    "name": "Business of Happiness",
    "slug": "boh-app",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    ...
  }
}
```

Leave everything else in the file untouched.

- [ ] **Step 4: Verify**

Run: `npx expo config --json | python3 -c "import json,sys; c=json.load(sys.stdin); print(c['version'], c['extra']['eas']['projectId'], c['icon'])"`
Expected: `1.0.0 <uuid> ./assets/icon.png`

Run: `npm run typecheck && npm test`
Expected: both pass (note memory: run jest from repo root, not a `.claude/worktrees` path, or override `testPathIgnorePatterns`).

- [ ] **Step 5: Commit**

```bash
git add app.json assets/icon.png
git commit -m "chore(config): link EAS project, set v1.0.0, add root icon asset"
```

---

### Task 3: Android native project + FCM push credentials

**Goal:** The repo has a buildable `android/` project with adaptive icon, splash screen, and Google services config, and Expo's push service holds FCM V1 credentials so Android devices receive notifications.

**Files:**
- Modify: `app.json` (android section + splash plugin), `package.json` (adds expo-splash-screen)
- Create: `google-services.json` (repo root; user downloads from Firebase)
- Create: `android/` (generated by `expo prebuild`)

**Acceptance Criteria:**
- [ ] `app.json` android block has `adaptiveIcon` and `googleServicesFile`
- [ ] `expo-splash-screen` plugin configured with brand background `#FDFCF5`
- [ ] `npx expo prebuild --platform android` completes without error
- [ ] `cd android && ./gradlew :app:assembleDebug` succeeds
- [ ] `eas credentials` shows a Google Service Account key configured for FCM V1

**Verify:** `cd android && ./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`

**Steps:**

- [ ] **Step 1: Get Firebase config from the user**

The user must (in the Firebase console, https://console.firebase.google.com):
1. Create a Firebase project (or reuse one) and add an Android app with package `com.thebizofhappiness.app`.
2. Download `google-services.json` and place it at the repo root.
3. In Project Settings → Service accounts, generate a service-account JSON key (needed for FCM V1 in Step 5) and keep it somewhere private — do NOT commit it.

Block on this: the task cannot proceed without `google-services.json` at the repo root.

- [ ] **Step 2: Install expo-splash-screen and update app.json**

```bash
npx expo install expo-splash-screen
```

In `app.json`, replace the `android` block and add the splash plugin to `plugins`:

```json
"android": {
  "package": "com.thebizofhappiness.app",
  "edgeToEdgeEnabled": true,
  "permissions": ["CAMERA", "READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO"],
  "adaptiveIcon": {
    "foregroundImage": "./assets/icon.png",
    "backgroundColor": "#FDFCF5"
  },
  "googleServicesFile": "./google-services.json"
}
```

Add to the `plugins` array:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/icon.png",
    "imageWidth": 200,
    "backgroundColor": "#FDFCF5"
  }
]
```

(`#FDFCF5` is the brand `background` color from `src/theme/palette.json`. The adaptive icon reuses the app icon as foreground; if the round mask crops it badly on device, ask the user for a padded foreground asset — do not silently ship a cropped icon.)

- [ ] **Step 3: Generate the Android project**

```bash
npx expo prebuild --platform android
```

Do NOT run prebuild for iOS — the committed `ios/` project must not be regenerated (see memory note about iCloud xattrs breaking iOS builds; the iOS project is managed as-is).

- [ ] **Step 4: Verify the Android build compiles**

```bash
cd android && ./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`. (Requires a JDK; if none is installed, `brew install --cask temurin@17` or ask the user.)

- [ ] **Step 5: Upload FCM V1 credentials to Expo**

Interactive — ask the user to run:

```
! npx eas-cli credentials --platform android
```

and choose: production profile → Google Service Account → "Set up a Google Service Account Key for Push Notifications (FCM V1)" → upload the service-account JSON from Step 1.

- [ ] **Step 6: Commit**

```bash
git add app.json package.json package-lock.json google-services.json android
git commit -m "feat(android): generate native project with adaptive icon, splash, and FCM config"
```

---

### Task 4: Production env vars for EAS builds

**Goal:** Production and preview EAS builds embed the Supabase URL and anon key so the app does not crash at startup (`src/lib/supabase.ts` throws when they are missing).

**Files:**
- Modify: `eas.json`

**Acceptance Criteria:**
- [ ] `eas.json` `build.production.env` and `build.preview.env` contain `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Values match the linked remote project `rvznhgubzjublttmqudh` (same values as local `.env`)

**Verify:** `python3 -c "import json; e=json.load(open('eas.json')); print(e['build']['production']['env']['EXPO_PUBLIC_SUPABASE_URL'])"` → `https://rvznhgubzjublttmqudh.supabase.co`

**Steps:**

- [ ] **Step 1: Read the values from the local .env**

```bash
grep EXPO_PUBLIC .env
```

These are the remote project's URL and anon (publishable) key — the app already runs against the remote project in dev. The anon key is public by design (it ships in the client bundle), so committing it to `eas.json` is safe; row security is enforced by RLS.

- [ ] **Step 2: Edit eas.json**

Add an `env` block to both `preview` and `production` profiles, using the exact values from Step 1:

```json
"preview": {
  "distribution": "internal",
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://rvznhgubzjublttmqudh.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<value of EXPO_PUBLIC_SUPABASE_ANON_KEY from .env>"
  }
},
"production": {
  "autoIncrement": true,
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://rvznhgubzjublttmqudh.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<value of EXPO_PUBLIC_SUPABASE_ANON_KEY from .env>"
  }
}
```

- [ ] **Step 3: Verify**

Run: `python3 -c "import json; e=json.load(open('eas.json')); [print(p, bool(e['build'][p].get('env',{}).get('EXPO_PUBLIC_SUPABASE_ANON_KEY'))) for p in ('preview','production')]"`
Expected: `preview True` and `production True`

- [ ] **Step 4: Commit**

```bash
git add eas.json
git commit -m "chore(eas): embed Supabase public env vars in preview and production builds"
```

---

### Task 5: Set Supabase secrets and deploy edge functions (USER APPROVAL REQUIRED)

> **Superseded 2026-08-08** — see `docs/superpowers/plans/2026-08-08-v1-no-email-provider.md`. v1 ships with `EMAIL_PROVIDER=none`; the FunnelBreezy/Resend setup steps below were not carried out.

**Goal:** The remote Supabase project has `EMAIL_PROVIDER=funnelbreezy`, the FunnelBreezy webhook URL, and Resend fallback secrets set, and both edge functions (`notify`, `reach-out-email`) are deployed at their current code.

**Files:**
- None modified — remote configuration only. Depends on Task 1's commit.

**Acceptance Criteria:**
- [ ] `supabase secrets list` shows `EMAIL_PROVIDER`, `FUNNELBREEZY_WEBHOOK_URL`, `RESEND_API_KEY`, `RESEND_FROM`
- [ ] `supabase functions list` shows `notify` and `reach-out-email` as ACTIVE with a deploy timestamp after Task 1's commit
- [ ] User explicitly approved the deploy commands before they ran (standing instruction: deploys to remote Supabase need explicit approval)

**Verify:** `supabase functions list` → both functions ACTIVE, updated today

**Steps:**

- [ ] **Step 1: Log in to the Supabase CLI**

The CLI currently has no access token (`supabase functions list` returns LegacyPlatformAuthRequiredError). Ask the user to run:

```
! supabase login
```

- [ ] **Step 2: Collect values from the user**

Ask the user for:
1. The FunnelBreezy **workflow inbound-webhook URL** (per project memory, FunnelBreezy has no public API; each workflow exposes an inbound-webhook URL).
2. The verified Resend sender, e.g. `Business of Happiness <no-reply@thebizofhappiness.com>` — the domain must be verified in the Resend dashboard.
3. Confirmation that `RESEND_API_KEY` is already set (check with `supabase secrets list`); if not, the key from the Resend dashboard.

- [ ] **Step 3: STOP — get explicit approval, then set secrets and deploy**

Show the user the exact commands and wait for approval before running:

```bash
supabase secrets set \
  EMAIL_PROVIDER=funnelbreezy \
  FUNNELBREEZY_WEBHOOK_URL="<url from user>" \
  RESEND_FROM="<verified sender from user>"

supabase functions deploy reach-out-email
supabase functions deploy notify
```

(The project is already linked — `supabase/.temp/project-ref` is `rvznhgubzjublttmqudh` — so no `--project-ref` flag is needed. Migrations are already in sync with remote; nothing to push there.)

- [ ] **Step 4: Verify**

```bash
supabase secrets list
supabase functions list
```

Expected: all four secrets present; both functions ACTIVE with today's date.

- [ ] **Step 5: Live smoke check (with user)**

Have the user (or a test account) tap "Reach Out Here" in the app and send a message, then confirm the email arrives at both drtarrynmaccarthy.com inboxes via FunnelBreezy. If FunnelBreezy misroutes, flip back instantly with `supabase secrets set EMAIL_PROVIDER=resend` (no redeploy needed — env is read per-request).

---

### Task 6: Deploy boh-admin to static hosting

**Goal:** The admin portal is live on a public HTTPS domain with its Supabase env configured.

**Files:**
- Create: `boh-admin/vercel.json`

**Acceptance Criteria:**
- [ ] `boh-admin` production build succeeds locally (`npm run build` in `boh-admin/`)
- [ ] Deployed URL loads the login screen over HTTPS
- [ ] SPA routes deep-link correctly (no 404 on refresh) via the rewrite rule

**Verify:** `curl -s -o /dev/null -w "%{http_code}" https://<deployed-domain>/` → `200`

**Steps:**

- [ ] **Step 1: Add SPA rewrite config**

Create `boh-admin/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Verify the production build locally**

```bash
cd boh-admin && npm run build
```

Expected: `tsc -b` clean and Vite build output in `dist/`.

- [ ] **Step 3: Deploy (interactive — user runs)**

Vercel is the default host (any static host works; FOR_PROD.md listed Vercel/Netlify/CF Pages — Vercel chosen as the zero-config option for Vite; say so and let the user object). Ask the user to run:

```
! cd boh-admin && npx vercel login && npx vercel --prod
```

Then in the Vercel dashboard (Project → Settings → Environment Variables) set, with the same values as `boh-admin/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

and redeploy (`npx vercel --prod` again) so the env is baked into the build.

- [ ] **Step 4: Verify**

Run: `curl -s -o /dev/null -w "%{http_code}" https://<deployed-domain>/`
Expected: `200`. Also open the URL and confirm the admin login screen renders.

- [ ] **Step 5: Commit**

```bash
git add boh-admin/vercel.json
git commit -m "chore(admin): add Vercel SPA rewrite config"
```

Record the deployed domain — Task 7 needs it.

---

### Task 7: Supabase Auth redirect URLs for the admin portal

**Goal:** Supabase Auth accepts redirects from the admin portal in dev and prod.

**Files:**
- None — Supabase dashboard configuration. Depends on Task 6 (needs the deployed domain).

**Acceptance Criteria:**
- [ ] Supabase Dashboard → Authentication → URL Configuration → Redirect URLs contains `http://localhost:5173` and `https://<deployed-admin-domain>`
- [ ] Admin login flow completes from the deployed domain without a redirect error

**Verify:** Log in on the deployed admin portal → lands back in the portal authenticated (no `redirect_to` error).

**Steps:**

- [ ] **Step 1: Add the URLs (user, in dashboard)**

There is no CLI for this. Ask the user to open
`https://supabase.com/dashboard/project/rvznhgubzjublttmqudh/auth/url-configuration`
and add to **Redirect URLs**:
- `http://localhost:5173`
- `https://<deployed-admin-domain>` (from Task 6)

- [ ] **Step 2: Verify**

Log in on the deployed admin portal with an admin account; confirm the session establishes and no redirect error appears. Also confirm local dev login at `http://localhost:5173` still works.

---

### Task 8: Record the SSO deferral and refresh FOR_PROD.md

**Goal:** REQUIREMENTS.md records the approved SSO deviation, and FOR_PROD.md reflects only what remains after this plan.

**Files:**
- Modify: `REQUIREMENTS.md` (System reqs section)
- Modify: `FOR_PROD.md` (rewrite)

**Acceptance Criteria:**
- [ ] REQUIREMENTS.md notes SSO is deferred with the approval date, directly under the auth requirement
- [ ] FOR_PROD.md no longer lists items completed by Tasks 1-7; it lists only genuinely remaining manual items

**Verify:** `grep -n 'deferred' REQUIREMENTS.md` → one hit in System reqs; `grep -c 'leif@lmgroup' FOR_PROD.md` → `0`

**Steps:**

- [ ] **Step 1: Amend REQUIREMENTS.md**

In the `## System reqs` section, change:

```markdown
- Supabase Auth with social SSO, user info is gathered from this
```

to:

```markdown
- Supabase Auth with social SSO, user info is gathered from this
  - Social SSO deferred to post-launch by owner decision (2026-07-14); v1 launches with email/password auth
```

- [ ] **Step 2: Rewrite FOR_PROD.md**

Replace the whole file with the still-open manual items (adjust to reality at execution time — anything already done in Tasks 1-7 must not reappear):

```markdown
# Remaining before store submission

- App Store Connect: create the app record, upload screenshots, set the privacy
  nutrition labels (accounts, user content, photos/videos), link the privacy
  policy at https://thebizofhappiness.com/legal/#privacy
- Play Console: create the app, complete the Data safety form, upload assets
- Confirm the production iOS build carries aps-environment=production
  (see launch verification task)
- Post-launch: implement social SSO (deferred 2026-07-14); flip EMAIL_PROVIDER
  back to resend if FunnelBreezy routing misbehaves
```

- [ ] **Step 3: Verify and commit**

Run: `grep -n 'deferred' REQUIREMENTS.md` → one hit. Run: `grep -c 'lmgroup' FOR_PROD.md` → `0`.

```bash
git add REQUIREMENTS.md FOR_PROD.md
git commit -m "docs: record SSO deferral and refresh pre-launch checklist"
```

---

### Task 9: Production builds and launch verification

**Goal:** Production builds exist for both platforms, push notifications and reach-out email work end to end on real devices, and the iOS build carries the production push entitlement.

**Files:**
- None — build, install, observe. Depends on Tasks 1-7.

**Acceptance Criteria:**
- [ ] `eas build --platform ios --profile production` and `eas build --platform android --profile production` both finish green
- [ ] The iOS .ipa's entitlements show `aps-environment: production` (the committed entitlements file says `development`; distribution signing must swap it — this checks that it actually did)
- [ ] On a real iOS device (TestFlight) and a real Android device (Play internal testing): sign in works, a DM sent from another account produces a push notification, and "Reach Out Here" delivers the message to the admin/Tarryn in-app inbox (no email — deferred post-launch, see REQUIREMENTS.md)
- [ ] An announcement posted from the admin portal produces a push on both devices

**Verify:** `codesign -d --entitlements - <extracted .app>` → contains `aps-environment` = `production`; plus the on-device observations above.

**Steps:**

- [ ] **Step 1: Kick off production builds (user approval for credentials prompts)**

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

First run is interactive (Apple team login for distribution cert/profile; Android keystore generation) — the user must drive the credential prompts.

- [ ] **Step 2: Check the iOS push entitlement**

Download the .ipa from the EAS build page, then:

```bash
unzip -q build.ipa -d /tmp/ipa-check
codesign -d --entitlements - "/tmp/ipa-check/Payload/BusinessofHappiness.app" 2>/dev/null | grep -A1 aps-environment
```

Expected: `production`. If it says `development`, the provisioning profile is wrong — regenerate distribution credentials via `npx eas-cli credentials --platform ios` and rebuild.

- [ ] **Step 3: Distribute and test on devices**

- iOS: `npx eas-cli submit --platform ios` → TestFlight; install on a real iPhone.
- Android: `npx eas-cli submit --platform android` (or sideload the .aab via internal testing).

On each device, with two accounts:
1. Sign in → home screen greets by name.
2. Account B sends account A a DM → A receives a push (app backgrounded).
3. A taps "Reach Out Here", sends a message → user confirms it appears in the admin/Tarryn in-app inbox (no email for v1).
4. Post an announcement from the deployed admin portal → both devices receive a push.

Record each observation (screenshot or note) before calling this task done. If any check fails, debug before proceeding — do not submit for review with failing checks.

---

## Out of scope (explicitly)

- Social SSO (deferred, recorded in Task 8)
- Admin content-deletion tooling (REQUIREMENTS.md pushes this to the admin portal phase)
- Purchasable meditations/audios (v2 per REQUIREMENTS.md)
- FunnelBreezy purchase-webhook course whitelisting (REQUIREMENTS.md allows manual whitelist via Supabase for now)
- Store listing copy/screenshots themselves (tracked in FOR_PROD.md, owner-provided)
