# Admin Webapp v0 (Developer Skeleton) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v0 skeleton of the Business of Happiness admin portal: a Vite + React SPA in `boh-admin/` with Google SSO gated to admin/tarryn roles, the admin RLS migration, the `course-content` storage bucket, and a sidebar navigation shell with placeholder pages.

**Architecture:** Single-page app in a `boh-admin/` folder of this repo, talking directly to the existing Supabase project with the anon key. Admin capability is enforced server-side by new RLS policies for the `admin`/`tarryn` roles (the `is_staff()` helper already exists); the SPA's role gate is UX, not security. No server layer.

**Tech Stack:** Vite 7, React 19, TypeScript, Tailwind CSS 3 (shared palette with the mobile app), @supabase/supabase-js v2, @tanstack/react-query v5, react-router-dom v7, Vitest + React Testing Library + jsdom.

**User decisions (already made):**
- All five admin capabilities (inbox, content, whitelist, announcements, moderation) land in webapp v1; this plan is v0 only, each v1 capability gets its own follow-up plan.
- Stack: Vite + React SPA, sibling folder `boh-admin/` in this repo, desktop-first.
- Privileges via admin RLS policies + existing edge functions, not a service-role backend.
- Admin sign-in: Google SSO (existing Supabase provider) + `users.role` gate; no Apple SSO on web.
- Media uploads go through the portal to Supabase Storage (bucket created here, upload UI in a v1 plan).
- Test runner: Vitest (user-approved deviation from the spec's "Jest"; spec updated in Task 6).

**Spec:** `docs/superpowers/specs/2026-07-01-admin-webapp-versioning-design.md`

**Repo facts the implementer needs (verified during planning):**
- `public.is_staff()` (security definer) already exists and staff already have RLS write on `announcements` and delete on `community_posts`/`post_replies` — do NOT re-add those.
- RLS policies are NOT enough in this repo: table-level `grant`s for `authenticated` were added separately (migration `20260629000004_grants.sql`) after every query failed with "permission denied". New staff policies need matching grants.
- The mobile app's color palette lives at `src/theme/palette.json` (repo root) and is consumed by `tailwind.config.js` via `require` — the admin app reuses the same file.
- Generated DB types live at `src/types/database.types.ts` (repo root).
- Local Supabase stack is configured (`supabase/config.toml`, db on port 54322).
- Root `package.json` runs Jest with `testPathIgnorePatterns`, and root `eslint.config.js` uses flat-config ignores — both must ignore `boh-admin/`.
- Prettier style (copy verbatim): `{"semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100, "tabWidth": 2}`.
- Do not use emoji anywhere (project design principle).

---

## File Structure

```
boh-admin/
  index.html                     # Vite entry, title "Business of Happiness Admin"
  package.json                   # scripts: dev/build/lint/preview/test/typecheck; prettier block
  vite.config.ts                 # react plugin, @ alias, vitest (jsdom, globals, setup, test env)
  tsconfig.json / tsconfig.app.json / tsconfig.node.json   # template + paths + test types
  eslint.config.js               # Vite react-ts template config, unchanged
  tailwind.config.cjs            # requires ../src/theme/palette.json
  postcss.config.cjs
  .env.example                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  src/
    main.tsx                     # template, renders <App />
    App.tsx                      # providers + router (placeholder in Task 1, real in Task 6)
    App.test.tsx                 # smoke test (Task 1), shell test (Task 6)
    index.css                    # tailwind directives
    vite-env.d.ts                # + typed ImportMetaEnv
    constants/text.ts            # ALL user-facing copy
    lib/supabase.ts              # typed client
    lib/queryClient.ts
    lib/cn.ts                    # clsx + tailwind-merge
    types/database.types.ts      # copied from ../src/types/database.types.ts
    providers/AuthProvider.tsx   # session + role resolution (+ test)
    pages/SignInPage.tsx         # Google SSO + admins-only message (+ test)
    components/RequireStaff.tsx  # route guard (+ test)
    components/AdminLayout.tsx   # sidebar shell
    components/PlaceholderPage.tsx
    test/setup.ts                # jest-dom matchers
supabase/migrations/20260701000001_admin_portal.sql   # staff RLS + grants + course-content bucket
```

---

### Task 1: Scaffold the boh-admin Vite project

**Goal:** A building, linting, testable Vite + React + TypeScript project in `boh-admin/`, wired with the `@/` alias, Vitest, and prettier, and ignored by the root repo's Jest/ESLint.

**Files:**
- Create: `boh-admin/` (via Vite template: `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`)
- Create: `boh-admin/src/test/setup.ts`, `boh-admin/src/App.test.tsx`
- Delete: `boh-admin/src/App.css`, `boh-admin/src/assets/react.svg`, `boh-admin/public/vite.svg`
- Modify: `package.json` (root — jest ignore), `eslint.config.js` (root — ignore boh-admin)

**Acceptance Criteria:**
- [ ] `npm run test`, `npm run lint`, `npm run build`, `npm run typecheck` all pass inside `boh-admin/`
- [ ] `@/` alias resolves in both app code and tests
- [ ] Root-level `npm run lint` and `npm test` still pass and do not descend into `boh-admin/`

**Verify:** `cd boh-admin && npm run lint && npm run typecheck && npm run test && npm run build` → all succeed; then `cd .. && npm run lint && npm test` → unchanged results.

**Steps:**

- [ ] **Step 1: Scaffold from the Vite template**

```bash
cd /Users/leif/Documents/rice/projects/boh/boh-app
npm create vite@latest boh-admin -- --template react-ts
cd boh-admin
npm install
```

- [ ] **Step 2: Add dependencies**

```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom clsx tailwind-merge
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/node prettier
```

- [ ] **Step 3: Replace `boh-admin/vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Dummy values so modules that read import.meta.env at import time
    // (src/lib/supabase.ts) do not throw in tests that mock the client.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
```

- [ ] **Step 4: Wire alias + test types into `boh-admin/tsconfig.app.json`**

Add inside `compilerOptions` (keep everything the template already sets):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

- [ ] **Step 5: Update `boh-admin/package.json` scripts and prettier**

Merge into the template `package.json` (keep template `dev`/`build`/`lint`/`preview`):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b"
  },
  "prettier": {
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
}
```

- [ ] **Step 6: Create `boh-admin/src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7: Strip template boilerplate**

```bash
rm src/App.css src/assets/react.svg public/vite.svg
```

Replace `boh-admin/src/App.tsx`:

```tsx
export default function App() {
  return <h1>Business of Happiness Admin</h1>;
}
```

Replace `boh-admin/index.html` `<title>` with `Business of Happiness Admin` and delete the `<link rel="icon" ...>` line.

- [ ] **Step 8: Write the smoke test `boh-admin/src/App.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";

import App from "./App";

test("renders the app name", () => {
  render(<App />);
  expect(screen.getByText("Business of Happiness Admin")).toBeInTheDocument();
});
```

- [ ] **Step 9: Run the suite to verify it passes**

Run: `npm run test`
Expected: 1 test file, 1 passed.

- [ ] **Step 10: Keep the root toolchain out of boh-admin**

Root `package.json` — add to `jest.testPathIgnorePatterns`:

```json
"testPathIgnorePatterns": ["/node_modules/", "/.claude/", "/boh-admin/"]
```

Root `eslint.config.js` — extend ignores:

```js
    ignores: ["dist/*", ".expo/*", "node_modules/*", "babel.config.js", "boh-admin/*"],
```

- [ ] **Step 11: Full verification**

Run: `cd boh-admin && npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all pass, `dist/` produced.
Run: `cd .. && npm run lint && npm test`
Expected: same results as before this task (no boh-admin files touched).

- [ ] **Step 12: Commit**

```bash
git add boh-admin package.json eslint.config.js
git commit -m "feat(admin): scaffold boh-admin Vite + React + Vitest project"
```

---

### Task 2: Tailwind with the shared palette + central text file

**Goal:** Tailwind CSS 3 configured against the mobile app's `src/theme/palette.json`, plus `src/constants/text.ts` holding all copy and a `cn()` helper.

**Files:**
- Create: `boh-admin/tailwind.config.cjs`, `boh-admin/postcss.config.cjs`
- Create: `boh-admin/src/constants/text.ts`, `boh-admin/src/lib/cn.ts`
- Modify: `boh-admin/src/index.css`, `boh-admin/src/App.tsx`, `boh-admin/src/App.test.tsx`

**Acceptance Criteria:**
- [ ] Built CSS contains palette colors (e.g. background `#FBF7F2`)
- [ ] `App.tsx` renders copy from `text.ts`, no hardcoded strings
- [ ] `npm run test` and `npm run build` pass

**Verify:** `cd boh-admin && npm run test && npm run build && grep -il "fbf7f2" dist/assets/*.css` → test passes, grep prints a CSS file.

**Steps:**

- [ ] **Step 1: Install Tailwind toolchain**

```bash
cd boh-admin
npm install -D tailwindcss@^3.4.19 postcss autoprefixer
```

- [ ] **Step 2: Create `boh-admin/tailwind.config.cjs`**

(`.cjs` because the package is `"type": "module"`; `require` pulls the same palette file the mobile app's NativeWind config uses.)

```js
/** @type {import('tailwindcss').Config} */
// Colors are sourced from the palette shared with the mobile app
// (src/theme/palette.json at the repo root). Do not hardcode hex values in
// components — use the className tokens these generate (e.g. `bg-primary`).
const palette = require("../src/theme/palette.json");

module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: palette,
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Create `boh-admin/postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Replace `boh-admin/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create `boh-admin/src/constants/text.ts`**

```ts
// All user-facing copy for the admin portal lives here (see REQUIREMENTS.md:
// central text file, English only, no emoji).
export const text = {
  appName: "Business of Happiness Admin",
  common: {
    loading: "Loading",
  },
  signIn: {
    title: "Business of Happiness Admin",
    subtitle: "Sign in with your admin account to continue.",
    googleButton: "Sign in with Google",
    adminsOnly: "This portal is for admins only.",
  },
  nav: {
    inbox: "Inbox",
    content: "Content",
    whitelist: "Whitelist",
    announcements: "Announcements",
    moderation: "Moderation",
    signOut: "Sign out",
  },
  placeholder: {
    comingSoon: "This section is coming soon.",
  },
} as const;
```

- [ ] **Step 6: Create `boh-admin/src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Use the palette + text in `boh-admin/src/App.tsx`**

```tsx
import { text } from "@/constants/text";

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground">{text.appName}</h1>
    </main>
  );
}
```

Update `boh-admin/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { text } from "@/constants/text";

import App from "./App";

test("renders the app name", () => {
  render(<App />);
  expect(screen.getByText(text.appName)).toBeInTheDocument();
});
```

- [ ] **Step 8: Verify**

Run: `npm run test && npm run build && grep -il "fbf7f2" dist/assets/*.css`
Expected: test passes; grep prints one CSS filename (palette compiled in).

- [ ] **Step 9: Commit**

```bash
git add -A boh-admin
git commit -m "feat(admin): tailwind with shared palette, central text file"
```

---

### Task 3: Admin portal migration — staff RLS, grants, course-content bucket

**Goal:** One migration giving staff write access to course structure and the whitelist, staff visibility into Reach Out DMs, reply-as-Tarryn inserts, and the `course-content` storage bucket.

**Files:**
- Create: `supabase/migrations/20260701000001_admin_portal.sql`

**Acceptance Criteria:**
- [ ] `supabase db reset` applies all migrations cleanly
- [ ] `pg_policies` shows the 7 new public policies and 3 new storage policies
- [ ] Grants exist so the policies are actually reachable (this repo's known failure mode)
- [ ] No duplicate policies for announcements/moderation (staff already have those)

**Verify:** `supabase db reset` → success; then the `psql` policy query below → 10 rows.

**Steps:**

- [ ] **Step 1: Create `supabase/migrations/20260701000001_admin_portal.sql`**

```sql
-- Business of Happiness — admin portal foundation (admin v0)
-- Staff (admin/tarryn) write access to course structure and the whitelist,
-- staff visibility into Reach Out DMs, reply-as-Tarryn, and the
-- course-content storage bucket for lesson media.
--
-- Already covered by the initial schema — deliberately NOT re-added here:
--   announcements_write (staff full write), community_posts_delete,
--   post_replies_delete, community_posts_modify (staff moderation).

-- ---------------------------------------------------------------------------
-- Helper: is an arbitrary user id staff? Security definer so policies on
-- other tables can check roles without tripping users-table RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff_user(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid and u.role in ('admin', 'tarryn')
  );
$$;

-- ---------------------------------------------------------------------------
-- Course structure + whitelist: staff manage everything. Select policies
-- already exist; `for all` permissive policies simply OR with them (same
-- pattern as announcements_write).
-- ---------------------------------------------------------------------------
create policy courses_staff_write on public.courses
  for all using (public.is_staff()) with check (public.is_staff());

create policy course_sections_staff_write on public.course_sections
  for all using (public.is_staff()) with check (public.is_staff());

create policy lessons_staff_write on public.lessons
  for all using (public.is_staff()) with check (public.is_staff());

create policy lesson_resources_staff_write on public.lesson_resources
  for all using (public.is_staff()) with check (public.is_staff());

create policy course_whitelist_staff_write on public.course_whitelist
  for all using (public.is_staff()) with check (public.is_staff());

-- RLS filters rows, but Postgres also requires table-level privileges before
-- policies are consulted (see 20260629000004_grants.sql for the history).
grant insert, update, delete on public.courses to authenticated;
grant insert, update, delete on public.course_sections to authenticated;
grant insert, update, delete on public.lessons to authenticated;
grant insert, update, delete on public.lesson_resources to authenticated;
grant insert, update, delete on public.course_whitelist to authenticated;

-- ---------------------------------------------------------------------------
-- Reach Out inbox: staff can read any DM involving a staff participant
-- (user -> Tarryn messages and Tarryn -> user replies) without exposing
-- user <-> user private conversations.
-- ---------------------------------------------------------------------------
create policy direct_messages_staff_select on public.direct_messages
  for select using (
    public.is_staff()
    and (public.is_staff_user(sender_id) or public.is_staff_user(recipient_id))
  );

-- Portal replies are sent as the designated Tarryn account so the user always
-- sees "Tarryn", regardless of which admin replied. The users subquery runs
-- as the staff caller, who can read all user rows (users_select_self).
create policy direct_messages_staff_send_as_tarryn on public.direct_messages
  for insert with check (
    public.is_staff()
    and exists (
      select 1
      from public.users t
      where t.id = sender_id and t.role = 'tarryn'
    )
  );

-- select + insert on direct_messages were already granted to authenticated.

-- ---------------------------------------------------------------------------
-- course-content bucket: lesson videos, audio, and PDFs uploaded from the
-- admin portal. Public read via unguessable UUID paths (same rationale as
-- community-media); writes are staff-only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-content', 'course-content', true)
on conflict (id) do nothing;

create policy "Staff upload course content"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-content' and public.is_staff());

create policy "Staff update course content"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-content' and public.is_staff());

create policy "Staff delete course content"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-content' and public.is_staff());
```

- [ ] **Step 2: Apply migrations locally**

Run (repo root; start the local stack first with `supabase start` if it is not running):

```bash
supabase db reset
```

Expected: all 7 migrations apply, ending with `20260701000001_admin_portal.sql`, no errors.

- [ ] **Step 3: Verify policies and grants**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "select schemaname, policyname from pg_policies where policyname ilike '%staff%' order by 1, 2;"
```

Expected: 10 rows — `courses_staff_write`, `course_sections_staff_write`, `course_whitelist_staff_write`, `direct_messages_staff_select`, `direct_messages_staff_send_as_tarryn`, `lesson_resources_staff_write`, `lessons_staff_write` (public) and `Staff delete course content`, `Staff update course content`, `Staff upload course content` (storage).

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "select table_name, privilege_type from information_schema.role_table_grants where grantee = 'authenticated' and table_name = 'courses' order by 2;"
```

Expected: DELETE, INSERT, SELECT, UPDATE for `courses`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260701000001_admin_portal.sql
git commit -m "feat(admin): staff RLS policies, grants, and course-content bucket"
```

---

### Task 4: Supabase client, database types, and AuthProvider

**Goal:** A typed Supabase web client and an `AuthProvider` that resolves the session plus `users.role`, exposing `loading | signed-out | not-staff | staff`.

**Files:**
- Create: `boh-admin/src/lib/supabase.ts`, `boh-admin/src/lib/queryClient.ts`
- Create: `boh-admin/src/types/database.types.ts` (copied)
- Create: `boh-admin/src/providers/AuthProvider.tsx`
- Create: `boh-admin/.env.example`
- Modify: `boh-admin/src/vite-env.d.ts`
- Test: `boh-admin/src/providers/AuthProvider.test.tsx`

**Acceptance Criteria:**
- [ ] No session → `signed-out`; staff session → `staff` with role; non-staff session → `not-staff` AND `supabase.auth.signOut()` called
- [ ] `not-staff` status survives the sign-out null-session event (does not flip to `signed-out`)
- [ ] `npm run typecheck` passes with the copied Database types

**Verify:** `cd boh-admin && npx vitest run src/providers` → 3 tests pass.

**Steps:**

- [ ] **Step 1: Copy the generated DB types**

```bash
cp src/types/database.types.ts boh-admin/src/types/database.types.ts
```

(Regenerate both copies with `supabase gen types typescript --local` when the schema changes.)

- [ ] **Step 2: Type the env in `boh-admin/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Create `boh-admin/.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

(Root `.gitignore` already ignores `.env` at any depth. The developer copies this to `boh-admin/.env` with the same project URL/anon key the mobile app uses.)

- [ ] **Step 4: Create `boh-admin/src/lib/supabase.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env and set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

// Web defaults are what we want: localStorage session persistence and
// detectSessionInUrl for the OAuth redirect back from Google.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 5: Create `boh-admin/src/lib/queryClient.ts`**

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();
```

- [ ] **Step 6: Write the failing tests `boh-admin/src/providers/AuthProvider.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";

import { AuthProvider, useAuth } from "./AuthProvider";

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  return {
    single,
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single })),
      })),
    })),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));

function Probe() {
  const { status, role } = useAuth();
  return <div>{`${status}:${role ?? "none"}`}</div>;
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const session = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

test("no session resolves to signed-out", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  renderProbe();
  expect(await screen.findByText("signed-out:none")).toBeInTheDocument();
});

test("staff session resolves the role", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.single.mockResolvedValue({ data: { role: "tarryn" }, error: null });
  renderProbe();
  expect(await screen.findByText("staff:tarryn")).toBeInTheDocument();
});

test("non-staff session is signed out with not-staff status", async () => {
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.single.mockResolvedValue({ data: { role: "user" }, error: null });
  renderProbe();
  expect(await screen.findByText("not-staff:none")).toBeInTheDocument();
  expect(mocks.signOut).toHaveBeenCalled();
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `npx vitest run src/providers`
Expected: FAIL — cannot resolve `./AuthProvider`.

- [ ] **Step 8: Create `boh-admin/src/providers/AuthProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type AuthStatus = "loading" | "signed-out" | "not-staff" | "staff";
export type StaffRole = "admin" | "tarryn";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  role: StaffRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession(next: Session | null) {
      if (!next) {
        if (cancelled) return;
        setSession(null);
        setRole(null);
        // A non-staff sign-in triggers signOut below, which fires a null
        // session event; keep showing "admins only" rather than resetting.
        setStatus((prev) => (prev === "not-staff" ? "not-staff" : "signed-out"));
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", next.user.id)
        .single();
      if (cancelled) return;

      if (error || !data || (data.role !== "admin" && data.role !== "tarryn")) {
        // Set status before signOut so the resulting null-session event sees
        // prev === "not-staff" and preserves it.
        setSession(null);
        setRole(null);
        setStatus("not-staff");
        await supabase.auth.signOut();
        return;
      }

      setSession(next);
      setRole(data.role);
      setStatus("staff");
    }

    void supabase.auth.getSession().then(({ data }) => resolveSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase warns against awaiting other client calls inside this
      // callback; defer to the next tick.
      setTimeout(() => void resolveSession(next), 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    status,
    session,
    role,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/providers`
Expected: 3 passed.

- [ ] **Step 10: Full check and commit**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

```bash
git add -A boh-admin
git commit -m "feat(admin): supabase client, database types, AuthProvider with role gate"
```

---

### Task 5: Sign-in page and staff route guard

**Goal:** Google SSO sign-in page with the "admins only" rejection message, and a `RequireStaff` guard that protects admin routes.

**Files:**
- Create: `boh-admin/src/pages/SignInPage.tsx`
- Create: `boh-admin/src/components/RequireStaff.tsx`
- Modify: `FOR_PROD.md` (redirect URL note)
- Test: `boh-admin/src/pages/SignInPage.test.tsx`, `boh-admin/src/components/RequireStaff.test.tsx`

**Acceptance Criteria:**
- [ ] Sign-in button calls `signInWithOAuth` with provider `google` and `redirectTo: window.location.origin`
- [ ] `not-staff` status renders `text.signIn.adminsOnly`
- [ ] Guard: `loading` shows loading state, non-staff redirects to `/sign-in`, staff renders the child route
- [ ] FOR_PROD.md records the Supabase redirect-URL dashboard step

**Verify:** `cd boh-admin && npx vitest run src/pages src/components` → 6 tests pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

`boh-admin/src/pages/SignInPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { text } from "@/constants/text";

import { SignInPage } from "./SignInPage";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithOAuth: mocks.signInWithOAuth } },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>,
  );
}

test("clicking the button starts Google OAuth", async () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out" });
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: text.signIn.googleButton }));
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
});

test("not-staff shows the admins-only message", () => {
  mocks.useAuth.mockReturnValue({ status: "not-staff" });
  renderPage();
  expect(screen.getByText(text.signIn.adminsOnly)).toBeInTheDocument();
});

test("signed-out does not show the admins-only message", () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out" });
  renderPage();
  expect(screen.queryByText(text.signIn.adminsOnly)).not.toBeInTheDocument();
});
```

`boh-admin/src/components/RequireStaff.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { text } from "@/constants/text";

import { RequireStaff } from "./RequireStaff";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: mocks.useAuth }));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/sign-in" element={<div>sign-in page</div>} />
        <Route element={<RequireStaff />}>
          <Route path="/" element={<div>admin content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test("staff sees protected content", () => {
  mocks.useAuth.mockReturnValue({ status: "staff" });
  renderGuard();
  expect(screen.getByText("admin content")).toBeInTheDocument();
});

test("signed-out redirects to sign-in", () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out" });
  renderGuard();
  expect(screen.getByText("sign-in page")).toBeInTheDocument();
});

test("loading shows the loading state", () => {
  mocks.useAuth.mockReturnValue({ status: "loading" });
  renderGuard();
  expect(screen.getByText(text.common.loading)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages src/components`
Expected: FAIL — cannot resolve `./SignInPage` / `./RequireStaff`.

- [ ] **Step 3: Create `boh-admin/src/pages/SignInPage.tsx`**

```tsx
import { Navigate } from "react-router-dom";

import { text } from "@/constants/text";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export function SignInPage() {
  const { status } = useAuth();

  if (status === "staff") return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{text.signIn.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.signIn.subtitle}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-card bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-brand-600"
          onClick={() =>
            void supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin },
            })
          }
        >
          {text.signIn.googleButton}
        </button>
        {status === "not-staff" ? (
          <p className="mt-4 text-sm text-destructive">{text.signIn.adminsOnly}</p>
        ) : null}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create `boh-admin/src/components/RequireStaff.tsx`**

```tsx
import { Navigate, Outlet } from "react-router-dom";

import { text } from "@/constants/text";
import { useAuth } from "@/providers/AuthProvider";

export function RequireStaff() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{text.common.loading}</p>
      </main>
    );
  }

  if (status !== "staff") return <Navigate to="/sign-in" replace />;

  return <Outlet />;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/pages src/components`
Expected: 6 passed.

- [ ] **Step 6: Record the dashboard step in `FOR_PROD.md`**

Append:

```markdown
- Add the admin portal URLs to Supabase Auth -> URL Configuration -> Redirect URLs:
  - `http://localhost:5173` (dev)
  - the deployed boh-admin domain (prod)
```

- [ ] **Step 7: Full check and commit**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

```bash
git add -A boh-admin FOR_PROD.md
git commit -m "feat(admin): Google SSO sign-in page and staff route guard"
```

---

### Task 6: Navigation shell, router, and final verification

**Goal:** Sidebar layout with the five placeholder sections wired through react-router behind the guard; spec updated for the approved deviations; everything green.

**Files:**
- Create: `boh-admin/src/components/AdminLayout.tsx`, `boh-admin/src/components/PlaceholderPage.tsx`
- Modify: `boh-admin/src/App.tsx`, `boh-admin/src/App.test.tsx`
- Modify: `docs/superpowers/specs/2026-07-01-admin-webapp-versioning-design.md` (Vitest + public-bucket wording)

**Acceptance Criteria:**
- [ ] `/` redirects staff to `/inbox`; all five sections reachable via sidebar links
- [ ] Sign-out button calls `signOut` from the auth context
- [ ] Full suite passes: lint, typecheck, test, build
- [ ] Spec matches what was built (Vitest; public course-content bucket with unguessable paths)

**Verify:** `cd boh-admin && npm run lint && npm run typecheck && npm run test && npm run build` → all pass.

**Steps:**

- [ ] **Step 1: Create `boh-admin/src/components/PlaceholderPage.tsx`**

```tsx
import { text } from "@/constants/text";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text.placeholder.comingSoon}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `boh-admin/src/components/AdminLayout.tsx`**

```tsx
import { NavLink, Outlet } from "react-router-dom";

import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";

const navItems = [
  { to: "/inbox", label: text.nav.inbox },
  { to: "/content", label: text.nav.content },
  { to: "/whitelist", label: text.nav.whitelist },
  { to: "/announcements", label: text.nav.announcements },
  { to: "/moderation", label: text.nav.moderation },
];

export function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-6">
          <h1 className="text-lg font-semibold text-foreground">{text.appName}</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "block rounded-card px-4 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <button
            type="button"
            className="w-full rounded-card px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => void signOut()}
          >
            {text.nav.signOut}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write the failing shell test — replace `boh-admin/src/App.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { text } from "@/constants/text";

import App from "./App";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/providers/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: mocks.useAuth,
}));

test("staff lands on the inbox with full navigation", async () => {
  mocks.useAuth.mockReturnValue({ status: "staff", signOut: vi.fn() });
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(await screen.findByText(text.placeholder.comingSoon)).toBeInTheDocument();

  const labels = [
    text.nav.inbox,
    text.nav.content,
    text.nav.whitelist,
    text.nav.announcements,
    text.nav.moderation,
  ];
  for (const label of labels) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});

test("signed-out users land on the sign-in page", async () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out", signOut: vi.fn() });
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(
    await screen.findByRole("button", { name: text.signIn.googleButton }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — App still renders the Task 2 placeholder, no nav links.

- [ ] **Step 5: Replace `boh-admin/src/App.tsx` with the real router**

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/AdminLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RequireStaff } from "@/components/RequireStaff";
import { text } from "@/constants/text";
import { queryClient } from "@/lib/queryClient";
import { SignInPage } from "@/pages/SignInPage";
import { AuthProvider } from "@/providers/AuthProvider";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route element={<RequireStaff />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/inbox" replace />} />
                <Route path="/inbox" element={<PlaceholderPage title={text.nav.inbox} />} />
                <Route path="/content" element={<PlaceholderPage title={text.nav.content} />} />
                <Route
                  path="/whitelist"
                  element={<PlaceholderPage title={text.nav.whitelist} />}
                />
                <Route
                  path="/announcements"
                  element={<PlaceholderPage title={text.nav.announcements} />}
                />
                <Route
                  path="/moderation"
                  element={<PlaceholderPage title={text.nav.moderation} />}
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all test files pass (App, AuthProvider, SignInPage, RequireStaff).

- [ ] **Step 7: Sync the spec with the approved deviations**

In `docs/superpowers/specs/2026-07-01-admin-webapp-versioning-design.md`:
- Replace `Jest + React Testing Library` with `Vitest + React Testing Library` (both occurrences: v1 Error Handling & Testing section and anywhere else Jest is named).
- Replace the `course-content` bucket wording `admin-only write policies and authenticated read` with `admin-only write policies; public read via unguessable UUID paths, matching the existing community-media pattern`.

- [ ] **Step 8: Final verification**

Run: `cd boh-admin && npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all pass.
Run: `cd .. && npm run lint && npm test`
Expected: root repo unaffected.

Manual smoke (requires `boh-admin/.env` and a staff user): `npm run dev`, sign in with a Google account whose `users.role` is `admin`/`tarryn`, confirm redirect to `/inbox` and all five sidebar sections; sign in with a non-staff account and confirm the admins-only message.

- [ ] **Step 9: Commit**

```bash
git add -A boh-admin docs/superpowers/specs/2026-07-01-admin-webapp-versioning-design.md
git commit -m "feat(admin): navigation shell with guarded routes and placeholder pages"
```

---

## Task Dependencies

- Task 2 ← Task 1
- Task 3 ← (independent, can run in parallel with 1–2)
- Task 4 ← Task 1
- Task 5 ← Task 2, Task 4
- Task 6 ← Task 5
