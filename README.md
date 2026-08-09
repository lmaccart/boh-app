# The Business of Happiness

A mobile social learning app for Dr. Tarryn MacCarthy's Business of Happiness courses, plus a companion admin web portal. Members access course content, join a shared community, and message Tarryn directly; staff manage content, announcements, and the inbox from the admin portal.

## Repository Layout

```
boh-app/
  app/                  Mobile screens (expo-router file-based routing)
    (auth)/             Sign-in / sign-up flow
    (tabs)/             Main tabs: Start Here, Courses, Community, Resources
    lesson/             Lesson player screens
  src/
    api/                TanStack Query hooks (one module per domain, shared queryKeys)
    components/         Shared UI, media players, PushRegistrar
    constants/          Centralized app text (no inline string literals)
    lib/                Supabase client singleton, media helpers
    providers/          Auth provider
    theme/              palette.json - single source of truth for colors
    types/              Generated Supabase database types
  boh-admin/            Admin portal (Vite + React + TypeScript SPA)
  supabase/
    migrations/         Schema, RLS policies, staff grants
    functions/          Edge functions: notify, reach-out-email
  docs/                 Design specs and implementation plans
```

## Tech Stack

- **Mobile:** React Native 0.85, React 19, Expo 56, expo-router, TypeScript, NativeWind (Tailwind), TanStack Query v5, expo-notifications, expo-video / expo-audio
- **Admin portal:** Vite, React 19, TypeScript, Tailwind, TanStack Query, react-router, Vitest
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Database Webhooks); outbound email (Resend/FunnelBreezy) deferred post-launch — see REQUIREMENTS.md

Both clients share one Supabase project, the generated `database.types.ts`, and the color palette in `src/theme/palette.json` (consumed by both `colors.ts` and each app's Tailwind config).

## Features

### Start Here
Welcome screen with per-course and app-wide announcements, a "Hop back in" section resuming partially watched videos, and a settings card (login/logout, Privacy Policy, Terms of Service).

### Courses
Course access is whitelist-gated (`course_whitelist` table, enforced by RLS). Each course contains a Welcome section, Nervous System Regulation and Meditation/Visualization vaults, scheduled Modules with global go-live dates, and Live Session recordings. Lessons are videos with speed control; completing a lesson (played through, or next video watched 30+ seconds) unlocks its PDFs and audio into Resources. Playback progress persists across sessions for both audio and video.

### Community
An app-wide "Business of Happiness" community (all users auto-whitelisted) plus per-course communities. Users post text, photos, and video, reply to topics, and tag other users with mentions. Tapping a name or mention opens a direct message thread.

### Direct Messages and "Reach Out Here"
The DM inbox always shows a Reach Out Here button that messages Tarryn. The thread is visible to all staff in-app. The `reach-out-email` edge function exists to forward the message via email to `tarryn@drtarrynmaccarthy.com` and `hereforyou@drtarrynmaccarthy.com`, but is disabled for v1 (`EMAIL_PROVIDER=none`) by owner decision — see REQUIREMENTS.md. Staff replies from the admin portal are sent as the Tarryn account (RLS policy `direct_messages_staff_send_as_tarryn`).

### Resources
Personal library of favorited clips, audios, PDFs, and lessons, sorted and filterable by type.

### Push Notifications
`PushRegistrar` registers Expo push tokens on sign-in. Database webhooks on `announcements`, `community_posts`, and `direct_messages` invoke the `notify` edge function, which fans out through the Expo Push API (admin/Tarryn posts, DM replies, announcements).

## Architecture Notes

- **Data layer:** every domain (`announcements`, `courses`, `lessons`, `community`, `messages`, `favorites`, `progress`, `notifications`) has a hook module in `src/api/`, keyed through a shared `queryKeys` factory. Mutations invalidate their query keys on success.
- **Security:** all data access goes through Supabase RLS. `is_staff()` / `is_whitelisted()` are `security definer` functions to avoid recursive policy checks. The admin portal is a pure SPA on the anon key - no server layer; staff writes are gated by staff RLS policies.
- **Consistency rules:** all copy lives in central text constants (English only), all colors come from the shared palette, and the codebase uses no emoji.

## Getting Started

### Prerequisites

- Node 20+, npm
- Xcode / Android Studio for native builds (the app uses a dev client, not Expo Go)
- A Supabase project (schema in `supabase/migrations/`)

### Mobile app

```bash
npm install
cp .env.example .env    # fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run ios             # or: npm run android
```

Other scripts: `npm run lint`, `npm test`, `npm run typecheck`. EAS build profiles (`development`, `development-simulator`, `preview`, `production`) are defined in `eas.json`.

### Admin portal

```bash
cd boh-admin
npm install             # create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Other scripts: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`. See `boh-admin/README.md` for details.

### Supabase

Apply migrations from `supabase/migrations/` and deploy the edge functions:

```bash
supabase functions deploy notify
supabase functions deploy reach-out-email
```

`reach-out-email` is disabled for v1 (`EMAIL_PROVIDER=none`, see REQUIREMENTS.md). To re-enable post-launch: set `EMAIL_PROVIDER=resend` plus `RESEND_API_KEY`/`RESEND_FROM` (already set as dormant secrets), or `EMAIL_PROVIDER=funnelbreezy` plus `FUNNELBREEZY_WEBHOOK_URL`, then redeploy. The `notify` push function and its `announcements`/`community_posts`/`direct_messages` triggers are unaffected.

## Documentation

- `REQUIREMENTS.md` - product requirements (source of truth for app behavior)
- `PRODUCT.md` - product and design principles
- `FOR_PROD.md` - production launch checklist
- `docs/superpowers/specs/` - design specs (push notifications, app versioning, admin webapp)
- `docs/superpowers/plans/` - implementation plans

## Roles

| Role | Capabilities |
| --- | --- |
| User | Access whitelisted courses, post to community, message Tarryn |
| Admin | Everything a user can do, plus receive/respond to Reach Out Here messages and manage content via the admin portal |
| Tarryn | Primary admin; all admin capabilities, and the public identity for staff replies |
