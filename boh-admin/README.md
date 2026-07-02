# Business of Happiness Admin

Web admin portal for the Business of Happiness app. Vite + React + TypeScript SPA
backed by the shared Supabase project. See `docs/superpowers/specs/2026-07-01-admin-webapp-versioning-design.md`
at the repo root for the design.

## Setup

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(same project the mobile app uses). `.env` is gitignored at the repo root.

## Commands

- `npm run dev` — dev server
- `npm run test` — Vitest
- `npm run lint` / `npm run typecheck` / `npm run build`
