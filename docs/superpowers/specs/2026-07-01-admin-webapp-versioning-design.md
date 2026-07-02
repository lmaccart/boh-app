# Business of Happiness — Admin Webapp Versioning Plan

**Date:** 2026-07-01
**Scope:** v0 → v1 → v2 breakdown for the Business of Happiness admin webapp — the counterpart to `2026-06-29-boh-app-versioning-design.md`
**Stack:** Vite, React, TypeScript, Tailwind CSS, Supabase (same project as the mobile app)

---

## Context

The mobile app's v1 is complete: the full schema is migrated, the `notify` and `reach-out-email` edge functions are deployed (Resend-backed), and admin workflows currently happen directly in Supabase. The admin webapp replaces those direct-Supabase workflows.

## Architecture Decisions

- **Location:** `boh-admin/` folder in this repository, alongside the mobile app. Supabase migrations and edge functions stay in the existing `supabase/` directory, so admin schema changes never span repos.
- **Stack:** Vite + React SPA with TypeScript and Tailwind. No server layer — the browser talks directly to Supabase. Deploys as static files (Vercel/Netlify/Cloudflare Pages).
- **Privileges:** Admin capability is enforced by new RLS policies granting the `admin`/`tarryn` roles write access, not by a service-role backend. Edge functions are used only where side effects are needed (push notifications via the existing `notify` function).
- **Auth:** Google SSO through the Supabase provider the mobile app already uses. After session load the portal resolves `users.role`; anyone not `admin`/`tarryn` is signed out with an "admins only" message. Apple SSO is not offered on web.
- **Layout:** Desktop-first. Mobile-responsive admin layouts are out of scope.
- Central `src/constants/text.ts` for all user-facing copy; color palette shared with the mobile app's NativeWind config. No emoji anywhere in the UI.

---

## Version Definitions

| Version | Readiness | Description |
|---------|-----------|-------------|
| v0 | Developer skeleton | Project scaffolded, admin auth gate, navigation shell, admin RLS migration, course-content storage bucket — no real feature screens |
| v1 | Full admin replacement | All five admin capabilities functional; direct-Supabase workflows retired |
| v2 | Expanded operations | Admin community posting, analytics dashboards, user management |

---

## v0 — Developer Skeleton

### Project Setup
- Scaffold Vite + React + TypeScript project in `boh-admin/`
- Tailwind config with the color palette tokens from the mobile app's NativeWind config
- Linting (oxlint, the Vite 8 template's ESLint-compatible default), Prettier, path aliases matching the mobile app's conventions
- Central `src/constants/text.ts` for all user-facing copy
- Supabase client + environment config (`.env`) pointing at the existing project

### Auth Gate
- Google SSO sign-in screen using the existing Supabase Google provider
- Session persistence and OAuth redirect handling for web
- Role resolution from `users.role` on session load; non-admin sessions are signed out with an "admins only" message

### Supabase Foundation (migrations in existing `supabase/migrations/`)
- **Admin RLS migration:** policies granting `admin`/`tarryn` roles
  - insert/update/delete on `courses`, `course_sections`, `lessons`, `lesson_resources`, `course_whitelist`, `announcements`
  - delete on `community_posts` and `post_replies`
  - select on all `direct_messages` addressed to admin/tarryn recipients
- **Storage:** new `course-content` bucket for lesson videos, audio, and PDFs, with admin-only write policies; public read via unguessable UUID paths, matching the existing community-media pattern

### Navigation Shell
- Sidebar layout with empty placeholder pages: Inbox, Content, Whitelist, Announcements, Moderation
- Auth guard: unauthenticated or non-admin users land on the sign-in screen

---

## v1 — Full Admin Replacement

### Tarryn Inbox
- Conversation list of all `direct_messages` addressed to admin/tarryn accounts, grouped by user, sorted by latest message, with unread indicators
- Conversation view showing full message history with a user
- Replying inserts a `direct_messages` row from Tarryn; the existing `notify` edge function delivers the push notification to the user — no new backend

### Content Management
- CRUD screens for the course hierarchy: courses → sections → lessons → lesson resources
- Courses: title, start date
- Sections: type (welcome/nsr/meditation/module/live), title, `order`, and `go_live_date` scheduling for module sections
- Lessons: title, video, `order`
- Lesson resources: PDF and audio attachments
- Media uploads to the `course-content` bucket with progress bars; large video uploads use resumable (TUS) uploads
- Drag-to-reorder for sections and lessons

### Whitelist Management
- Per-course user list showing who has access
- Add by email: looked up against `users`; unmatched emails produce a clear error (the account must exist before whitelisting)
- Remove with confirmation

### Announcements
- Compose app-wide or per-course announcements
- Extend the `notify` edge function to handle `announcements` inserts (it currently covers admin community posts and DMs) so users receive a push notification on publish
- List and delete existing announcements

### Moderation
- Community feed browser covering the global feed and per-course feeds, showing posts and their replies
- Delete posts and replies with a confirmation step
- Deleting also removes associated media from the `community-media` bucket

### Error Handling & Testing
- Every mutation surfaces Supabase errors as toasts; destructive actions (deletes, whitelist removal) require confirmation dialogs
- Vitest + React Testing Library covering the auth/role gate, form validation, and the whitelist and inbox flows, mirroring the mobile app's test style (Vitest is the Vite-native runner; user-approved deviation from Jest)

---

## v2 — Expanded Operations

### Admin Community Posting
- Compose posts (text, photo, video) to the global or per-course community feeds from the portal
- Publishing triggers the existing admin-post push notification

### Analytics Dashboards
- Lesson completion rates and watch progress from `user_progress`
- Active-user counts
- Community activity: posts and replies over time
- Read-only queries; at most a few SQL views added by migration

### User Management
- All-users table with search
- Role changes (user/admin/tarryn) restricted to Tarryn
- Deactivate accounts

---

## Deferred / Out of Scope

- FunnelBreezy webhook monitoring (the webhook itself is mobile-spec v2; portal UI for it comes later if needed)
- In-app-purchase content management
- Multi-admin audit logging
- Mobile-responsive admin layouts (desktop-first)
