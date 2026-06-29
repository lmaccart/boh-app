# Business of Happiness — App Versioning Plan

**Date:** 2026-06-29
**Scope:** v0 → v1 → v2 breakdown for the Business of Happiness iOS/Android mobile app
**Stack:** Expo 56, React Native, TypeScript, NativeWind CSS, Supabase

---

## Version Definitions

| Version | Readiness | Description |
|---------|-----------|-------------|
| v0 | Developer skeleton | Project scaffolded, auth wired, navigation shell, full DB schema, design system — no real content screens |
| v1 | Closed beta | All core screens built and functional for real users |
| v2 | Public launch | Offline access, in-app purchases, automated access provisioning, admin portal |

---

## v0 — Developer Skeleton

### Project Setup
- Scaffold Expo 56 project with TypeScript
- Configure NativeWind CSS (Tailwind config, color palette tokens)
- Central `src/constants/text.ts` file for all user-facing copy
- ESLint, Prettier, path aliases

### Design System
- Theme: color, typography, spacing constants in NativeWind config
- Base component library: Button, Card, Avatar, Header, Input, Badge

### Supabase Foundation
- Supabase client + environment config (`.env`)
- Full schema design and migrations:

| Table | Key Columns |
|-------|-------------|
| `users` | id, email, name, avatar_url, role (user/admin/tarryn) |
| `courses` | id, title, start_date |
| `course_whitelist` | user_id, course_ids |
| `course_sections` | id, course_id, type (welcome/nsr/meditation/module/live), title, order, go_live_date |
| `lessons` | id, section_id, title, video_url, order |
| `lesson_resources` | id, lesson_id, type (pdf/audio), url, title |
| `user_progress` | user_id, lesson_id, position_seconds, completed_at |
| `favorites` | user_id, content_type, content_id |
| `community_posts` | id, user_id, course_id (nullable), body, media_url, created_at |
| `post_replies` | id, post_id, user_id, body, media_url, created_at |
| `direct_messages` | id, sender_id, recipient_id, body, created_at |
| `announcements` | id, course_id (nullable), body, created_at, posted_by |
| `push_tokens` | user_id, token, platform (ios/android) |

### Auth
- Supabase Auth with Apple + Google SSO
- Login screen, OAuth redirect handling, session persistence
- Role resolution from `users.role` on session load

### Navigation Shell
- Bottom tab navigator: Start Here, Community, Courses, Resources
- Stack navigators within each tab (empty placeholder screens)
- Auth guard: redirect unauthenticated users to login

---

## v1 — Closed Beta

### Start Here
- Personalized welcome screen: "Hello [Name], welcome to The Business of Happiness!"
- App-wide + per-course announcements feed
- "Hop back in" section (in-progress lessons pulled from `user_progress`)
- Settings card linking to settings screen
- Settings screen: logout, Privacy Policy link (`https://thebizofhappiness.com/legal/#privacy`), Terms of Service link (`https://thebizofhappiness.com/legal/#terms`)

### Courses
- Course whitelist gate (check `course_whitelist` on tab entry)
- Course home: sections listed by category (Welcome, NSR Vault, Meditation Vault, Modules, Live Sessions)
- Module go-live date enforcement: global per course, hide module sections until `course_sections.go_live_date`
- NSR Vault + Meditation Vault: clip/audio player with favoriting to Resources
- Video player: playback speed control, resume from last position, progress saved to `user_progress`
- Lesson completion logic: video played through OR next video in module watched >30 seconds
- PDF + audio resources unlocked on lesson completion, auto-added to Resources
- Live Session recordings section

### Community
- Global "Business of Happiness" feed (all authenticated users)
- Per-course community feeds (whitelist-gated by `course_whitelist`)
- Post creation: text, photo upload, video upload
- Topic/question post format: collapsed view, tap to expand replies
- Text + image replies on posts
- User @tagging in post body
- Push notification (expo-notifications) when admin/Tarryn creates a post
- DM icon in top-right corner opens DM list screen
- User-to-user direct messages (tap any username to open DM)
- "Reach Out Here" button pinned at top of DM list — routes message to Tarryn admin inbox
- Supabase Edge Function: on Reach Out message insert, email `tarryn@drtarrynmaccarthy.com` and `hereforyou@drtarrynmaccarthy.com` via email provider
- Push notification to user when Tarryn/admin responds to their Reach Out message

### Resources
- Favorites screen: clips, audios, PDFs, lessons
- Default sorted by content type, filterable by type
- Favoriting wired to heart/bookmark interactions throughout Courses screens
- PDFs and audio auto-added to Resources on lesson completion

---

## v2 — Public Launch

### Offline Access
- Download lessons (video, audio, PDF) for offline playback
- Cache management UI: storage usage display, delete downloads

### In-App Purchases
- Purchase individual meditations and nervous system regulation audios
- Purchased content auto-added to Resources

### Automated Access Provisioning
- FunnelBreezy webhook: map purchaser email to `course_whitelist` insert on purchase event

### Admin Portal (Web App, separate project)
- Content management: create/edit courses, sections, lessons, resources
- Announcement publishing (app-wide or per-course)
- Manual whitelist management (add/remove users by email)
- Community moderation: delete posts and replies
- Tarryn inbox: respond to Reach Out messages from within the portal

---

## Deferred / Out of Scope

- Admin content deletion from within the mobile app (admin portal only)
- Multi-language support (English only)
- Offline access (v2)
- Purchasing meditations/audios (v2)
- FunnelBreezy integration (v2)
- Admin portal (v2, separate project)
