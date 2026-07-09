# Codebase Trim & Tech Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim the repo to its minimal form: delete dead code, untrack accidental git artifacts, scope the broken typecheck/lint gates to the code they should cover, fix the one failing test, sync drifted generated types, and prune redundant npm dependencies.

**Architecture:** Three subsystems share this repo — the Expo mobile app (`app/`, `src/`), the admin webapp (`boh-admin/`, its own npm project), and Supabase edge functions/migrations (`supabase/`). Each task is a small, independently verifiable deletion or correction; nothing changes runtime behavior except making existing quality gates pass.

**Tech Stack:** React Native / Expo 56, TypeScript 6, Jest (`jest-expo`), Vite + Vitest (boh-admin), Supabase (Deno edge functions).

**User decisions (already made):** none — this plan was produced autonomously. Assumptions it makes: (1) leave `graphify-out/` tracked in git (it was committed deliberately in commit `113db33`); (2) do not touch files with uncommitted in-flight edits in the user's checkout (`app/(tabs)/_layout.tsx`, `boh-admin/src/pages/content/ContentPage.tsx`, `boh-admin/src/constants/text.ts`, `boh-admin/src/index.css`); (3) keep `prettier` in both package.jsons (knip flags it unused, but prettier config blocks in both package.jsons drive editor formatting).

**Baselines measured on 2026-07-09 (commit 72df217):**
- `npx tsc --noEmit` at root: **386 errors in 25 files** — every error is in `boh-admin/` or `supabase/functions/`, zero in mobile code. Root tsconfig `include: ["**/*.ts", "**/*.tsx"]` sweeps in the Vite/DOM admin project and Deno functions.
- `npx eslint .` at root: 2 errors (`import/no-unresolved` on Deno URL imports in both edge functions), 4 warnings (3 stale `eslint-disable` directives in `supabase/functions/notify/index.ts`, 1 `react-hooks/exhaustive-deps` in `src/components/PushRegistrar.tsx`). (A 3rd error, `react/display-name` in `app/(tabs)/_layout.tsx`, exists only in the user's uncommitted edits — not at HEAD, out of scope.)
- Mobile jest: 3 suites / 9 tests, all pass.
- Admin vitest: **1 failed** / 32 passed — `InboxPage.test.tsx` predates the `sent_by` audit column (commit 68f3744).
- Admin `tsc -b`: clean.
- knip: dead files `src/components/PlaceholderScreen.tsx`, `boh-admin/src/components/PlaceholderPage.tsx`, dead component `Skeleton`, unused dep `expo-file-system`, unused type exports listed per-task below.
- `git ls-tree HEAD .claude/worktrees/` shows two mode-160000 gitlinks accidentally committed.
- `src/types/database.types.ts` is missing `read_at` on `direct_messages` (added by migration `20260702000002_dm_read_state.sql`; the admin copy has it).

---

### Task 1: Untrack accidental `.claude/worktrees` gitlinks and ignore `.claude/`

**Goal:** Remove the two accidentally committed worktree gitlink entries from the git index and prevent recurrence.

**Files:**
- Modify: `.gitignore`
- Delete from index (not disk): `.claude/worktrees/admin-webapp-v0`, `.claude/worktrees/m5-push-notifications`

**Acceptance Criteria:**
- [ ] `git ls-files .claude` prints nothing
- [ ] `git check-ignore .claude/settings.json` exits 0 (path is ignored)
- [ ] `git status` no longer shows the two worktree paths as deleted

**Verify:** `git ls-files .claude | wc -l` → `0`

**Steps:**

- [ ] **Step 1: Remove the gitlinks from the index**

```bash
git rm --cached .claude/worktrees/admin-webapp-v0 .claude/worktrees/m5-push-notifications
```

Expected: `rm '.claude/worktrees/admin-webapp-v0'` and `rm '.claude/worktrees/m5-push-notifications'`.

- [ ] **Step 2: Ignore the `.claude` directory**

In `.gitignore`, append after the `# Logs` block:

```gitignore
# Claude Code session data / worktrees
.claude/
```

- [ ] **Step 3: Verify and commit**

```bash
git ls-files .claude | wc -l   # expect 0
git check-ignore .claude/ && echo ignored
git add .gitignore
git commit -m "chore: untrack accidental .claude worktree gitlinks" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Scope root typecheck and lint to the mobile app; delete stale lint directives; fix PushRegistrar hook deps

**Goal:** Make `npm run typecheck` (386 errors → 0) and `npx eslint .` (2 errors, 4 warnings → 0/0) pass by scoping them to the code they can correctly check, and delete the now-dead lint suppressions.

**Files:**
- Modify: `tsconfig.json`
- Modify: `eslint.config.js`
- Modify: `supabase/functions/notify/index.ts` (delete 3 comment lines)
- Modify: `src/components/PushRegistrar.tsx:12`

**Acceptance Criteria:**
- [ ] `npx tsc --noEmit` exits 0 with no output
- [ ] `npx eslint .` exits 0 with no errors or warnings
- [ ] No `eslint-disable` comments remain in `supabase/functions/`

**Verify:** `npm run typecheck && npx eslint . && echo CLEAN` → `CLEAN`

**Steps:**

- [ ] **Step 1: Exclude the other subprojects from the root tsconfig**

`boh-admin/` has its own `tsc -b` (Vite/DOM lib config) and `supabase/functions/` is Deno code (URL imports, `Deno` global) — neither can typecheck under the Expo/node config. In `tsconfig.json`, add an `exclude` after `include`:

```json
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "nativewind-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "boh-admin",
    "supabase/functions",
    ".claude"
  ]
```

- [ ] **Step 2: Run typecheck to verify 0 errors**

Run: `npm run typecheck`
Expected: exits 0, no output (was: `Found 386 errors in 25 files`).

- [ ] **Step 3: Ignore Deno edge functions in eslint**

The Expo eslint config resolves node imports, so `import ... from "https://esm.sh/..."` in the Deno functions is a false-positive `import/no-unresolved` error. In `eslint.config.js`, extend the ignores:

```js
// ESLint flat config (ESLint 9+). Uses Expo's shared config.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "node_modules/*",
      "babel.config.js",
      "boh-admin/*",
      "supabase/functions/*", // Deno runtime — not lintable with node resolution
      ".claude/*",
    ],
  },
];
```

- [ ] **Step 4: Delete the 3 stale eslint-disable directives in notify/index.ts**

`supabase/functions/notify/index.ts` contains three copies of this line (before `handleAnnouncement`, `handleCommunityPost`, `handleDirectMessage` — lines 36, 65, 108 at HEAD). ESLint already reports all three as "Unused eslint-disable directive", and Step 3 stops linting the file entirely. Delete all three lines:

```
// eslint-disable-next-line @typescript-eslint/no-explicit-any
```

Check: `grep -c "eslint-disable" supabase/functions/notify/index.ts` → `0`.

- [ ] **Step 5: Fix the PushRegistrar exhaustive-deps warning**

In `src/components/PushRegistrar.tsx`, `mutate` from React Query is referentially stable, so adding it to the dependency array is safe and silences the warning honestly:

```tsx
export function PushRegistrar() {
  const { mutate } = useRegisterPushToken();
  useEffect(() => {
    registerForPushNotifications().then((result) => {
      if (result) mutate(result);
    });
  }, [mutate]);
  return null;
}
```

- [ ] **Step 6: Verify both gates and the untouched test suite**

```bash
npm run typecheck && npx eslint . && npx jest --silent
```

Expected: typecheck silent, eslint silent, `Tests: 9 passed, 9 total`.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json eslint.config.js supabase/functions/notify/index.ts src/components/PushRegistrar.tsx
git commit -m "chore: scope typecheck/lint to mobile app, drop stale suppressions" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Delete dead mobile code (PlaceholderScreen, Skeleton, unused type exports)

**Goal:** Remove mobile source with zero importers, verified by knip and grep.

**Files:**
- Delete: `src/components/PlaceholderScreen.tsx` (no importers anywhere)
- Delete: `src/components/ui/Skeleton.tsx` (only referenced by the barrel)
- Modify: `src/components/ui/index.ts:11`
- Modify: `src/api/index.ts:30`, `src/api/messages.ts:28`
- Modify: `src/api/types.ts`
- Modify: `src/constants/text.ts:141`, `src/theme/colors.ts:8`

**Acceptance Criteria:**
- [ ] `grep -rn "PlaceholderScreen\|Skeleton" src app` returns nothing
- [ ] `npx tsc --noEmit` exits 0 (nothing referenced the deleted exports)
- [ ] `npx jest` passes (9 tests)

**Verify:** `npm run typecheck && npx jest --silent && npx eslint . && echo CLEAN` → `CLEAN`

**Steps:**

- [ ] **Step 1: Delete the two dead component files**

```bash
git rm src/components/PlaceholderScreen.tsx src/components/ui/Skeleton.tsx
```

- [ ] **Step 2: Remove the Skeleton barrel line**

In `src/components/ui/index.ts`, delete:

```ts
export { Skeleton, type SkeletonProps } from "./Skeleton";
```

- [ ] **Step 3: Stop exporting DmThread (used only inside messages.ts)**

In `src/api/index.ts`, inside the `from "./messages"` re-export block, delete the line:

```ts
  type DmThread,
```

In `src/api/messages.ts:28`, demote the export (the type is still used within the file):

```ts
// before
export type DmThread = {
// after
type DmThread = {
```

- [ ] **Step 4: Prune unused row/enum aliases from src/api/types.ts**

knip reports these exports have zero importers: `UserRow`, `PushTokenRow`, `CommunityPostInsert`, `PostReplyInsert`, `DirectMessageInsert`, `ResourceType`, `UserRole`. After removing the three `Insert` aliases, `TablesInsert` is also unused. The file becomes exactly:

```ts
// Convenience row aliases over the generated Supabase types, so feature code
// imports short names instead of Tables<"...">["Row"] everywhere.
import type { Tables, Enums } from "@/types/database.types";

export type CourseRow = Tables<"courses">;
export type CourseSectionRow = Tables<"course_sections">;
export type LessonRow = Tables<"lessons">;
export type LessonResourceRow = Tables<"lesson_resources">;
export type UserProgressRow = Tables<"user_progress">;
export type FavoriteRow = Tables<"favorites">;
export type CommunityPostRow = Tables<"community_posts">;
export type PostReplyRow = Tables<"post_replies">;
export type DirectMessageRow = Tables<"direct_messages">;
export type AnnouncementRow = Tables<"announcements">;

export type SectionType = Enums<"section_type">;
export type FavoriteContentType = Enums<"favorite_content_type">;
export type DevicePlatform = Enums<"device_platform">;
```

- [ ] **Step 5: Remove the two unused `typeof` type exports**

In `src/constants/text.ts`, delete line 141:

```ts
export type AppText = typeof text;
```

In `src/theme/colors.ts`, delete line 8:

```ts
export type Palette = typeof palette;
```

(Do NOT touch `src/types/database.types.ts` — it is Supabase codegen output; its unused `Constants`/`Json` exports are part of the generated format and would reappear on regeneration.)

- [ ] **Step 6: Verify**

```bash
grep -rn "PlaceholderScreen\|Skeleton\|AppText\|DmThread\b" src app --include="*.ts" --include="*.tsx" | grep -v "src/api/messages.ts"   # expect empty
npm run typecheck && npx jest --silent && npx eslint .
```

Expected: grep empty; typecheck/lint silent; `Tests: 9 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "chore: remove dead mobile components and unused type exports" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Sync mobile database.types.ts with the schema (missing `read_at`)

**Goal:** Fix generated-type drift: migration `20260702000002_dm_read_state.sql` added `direct_messages.read_at`, the admin copy was regenerated, the mobile copy was not.

**Files:**
- Modify: `src/types/database.types.ts` (the `direct_messages` block, ~lines 215–240)

**Acceptance Criteria:**
- [ ] `direct_messages` Row has `read_at: string | null`; Insert and Update have `read_at?: string | null`
- [ ] `diff src/types/database.types.ts boh-admin/src/types/database.types.ts` reports no differences inside the `direct_messages` block
- [ ] `npm run typecheck` still exits 0

**Verify:** `diff src/types/database.types.ts boh-admin/src/types/database.types.ts | wc -l` → `0`, then `npm run typecheck`

**Steps:**

- [ ] **Step 1: Add read_at to the three direct_messages shapes**

In `src/types/database.types.ts`, the `direct_messages` block currently reads (fields are alphabetical; `read_at` slots between `id` and `recipient_id`):

```ts
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          sent_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          sent_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          sent_by?: string | null
        }
```

i.e. insert `read_at: string | null` into Row and `read_at?: string | null` into Insert and Update. (Preferred long-term fix is regenerating via `npx supabase gen types typescript --project-id <ref> --schema public`, but that needs Supabase auth; this hand-sync makes the file byte-identical to the admin copy, which was regenerated from the live schema.)

- [ ] **Step 2: Verify the two copies are identical and typecheck passes**

```bash
diff src/types/database.types.ts boh-admin/src/types/database.types.ts && echo IDENTICAL
npm run typecheck
```

Expected: `IDENTICAL`; typecheck silent.

- [ ] **Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "fix: sync mobile database types with dm_read_state migration" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Fix the stale InboxPage test (missing `sent_by`)

**Goal:** Make the admin suite green: `InboxPage.tsx:173` inserts `{ sender_id: tarrynId, recipient_id, body, sent_by: adminId }` (commit 68f3744, replies sent as the Tarryn account with an audit column), but the test still expects a 3-key payload.

**Files:**
- Modify: `boh-admin/src/pages/InboxPage.test.tsx:43` (mock row type) and `:150-156` (expected payload)
- Test: same file — this task is itself the red→green cycle

**Acceptance Criteria:**
- [ ] `cd boh-admin && npx vitest run` → 10 files / 33 tests, all pass
- [ ] The assertion checks `sent_by` explicitly (audit trail is now covered by the test)

**Verify:** `cd boh-admin && npx vitest run` → all tests pass, 0 failed. (Counts: 33 tests / 10 files in the user's checkout; if executing in a worktree without the user's untracked `ContentPage.test.tsx`, the totals are lower — what matters is 0 failures.)

**Steps:**

- [ ] **Step 1: Confirm the current failure (red)**

Run: `cd boh-admin && npx vitest run src/pages/InboxPage.test.tsx`
Expected: FAIL — `expected [ { sender_id: 'admin-1', …(3) } ] to deeply equal [ { sender_id: 'admin-1', …(2) } ]`. (In the mock, the signed-in admin `admin-1` also holds the `tarryn` role, so `sender_id` and `sent_by` are both `"admin-1"`.)

- [ ] **Step 2: Update the mock type and the expectation**

In `boh-admin/src/pages/InboxPage.test.tsx` line 43:

```ts
// before
  insertedRows: [] as Array<{ sender_id: string; recipient_id: string; body: string }>,
// after
  insertedRows: [] as Array<{
    sender_id: string;
    recipient_id: string;
    body: string;
    sent_by: string;
  }>,
```

And in the assertion (lines ~150–156):

```ts
    expect(mocks.insertedRows).toEqual([
      {
        sender_id: "admin-1",
        recipient_id: "user-a",
        body: "We are here for you.",
        sent_by: "admin-1",
      },
    ]);
```

- [ ] **Step 3: Run the suite to verify green**

Run: `cd boh-admin && npx vitest run`
Expected: all test files pass, 0 failed (33 tests / 10 files in the user's checkout; fewer if the untracked `ContentPage.test.tsx` is absent).

- [ ] **Step 4: Commit**

```bash
git add boh-admin/src/pages/InboxPage.test.tsx
git commit -m "test: cover sent_by audit column in inbox reply insert" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Delete dead admin code (PlaceholderPage, ContentPage shim)

**Goal:** Remove the admin webapp's two dead files: `PlaceholderPage.tsx` (zero importers) and the one-line `pages/ContentPage.tsx` re-export shim left behind when ContentPage moved to `pages/content/`.

**Files:**
- Delete: `boh-admin/src/components/PlaceholderPage.tsx`
- Delete: `boh-admin/src/pages/ContentPage.tsx` (contains only `export { ContentPage } from "./content/ContentPage";`)
- Modify: `boh-admin/src/App.tsx:8`
- Modify: `boh-admin/src/App.test.tsx:14`

**Acceptance Criteria:**
- [ ] `grep -rn "PlaceholderPage\|pages/ContentPage\"" boh-admin/src` returns nothing
- [ ] `cd boh-admin && npx tsc -b` exits 0
- [ ] `cd boh-admin && npx vitest run` → all tests pass, 0 failed

**Verify:** `cd boh-admin && npx tsc -b && npx vitest run` → all green

**Steps:**

- [ ] **Step 1: Delete the dead files**

```bash
git rm boh-admin/src/components/PlaceholderPage.tsx boh-admin/src/pages/ContentPage.tsx
```

- [ ] **Step 2: Point App.tsx and its test at the real module**

`boh-admin/src/App.tsx` line 8:

```tsx
// before
import { ContentPage } from "@/pages/ContentPage";
// after
import { ContentPage } from "@/pages/content/ContentPage";
```

`boh-admin/src/App.test.tsx` line 14:

```tsx
// before
vi.mock("@/pages/ContentPage", () => ({ ContentPage: () => <div>Content page</div> }));
// after
vi.mock("@/pages/content/ContentPage", () => ({ ContentPage: () => <div>Content page</div> }));
```

- [ ] **Step 3: Verify**

```bash
cd boh-admin && npx tsc -b && npx vitest run
```

Expected: typecheck silent; all vitest tests pass, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add -A boh-admin/src
git commit -m "chore: drop admin PlaceholderPage and ContentPage re-export shim" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Prune redundant npm dependencies (mobile)

**Goal:** Remove four package.json entries that nothing imports: `expo-file-system` (zero references in source or app.json) and three devDeps that are already exact transitive dependencies — `test-renderer` (dependency of `@testing-library/react-native@14`), `react-test-renderer@19.2.3` (exact-pinned dependency of `jest-expo@56.0.5`), `react-server-dom-webpack` (dependency of `expo-router` and `jest-expo`).

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

**Acceptance Criteria:**
- [ ] The four names are gone from `package.json`
- [ ] `npm ls test-renderer react-test-renderer react-server-dom-webpack` still resolves all three via their parent packages, with no `UNMET` or `invalid` markers
- [ ] `npm install` prints no unmet-peer warnings
- [ ] `npx jest` passes and `npm run typecheck` exits 0

**Verify:** `npx jest --silent && npm run typecheck && echo CLEAN` → `CLEAN`

**Steps:**

- [ ] **Step 1: Remove the packages**

```bash
npm rm expo-file-system test-renderer react-test-renderer react-server-dom-webpack
```

Expected: package.json and lockfile updated; watch the output for `WARN` lines about unmet peers.

- [ ] **Step 2: Confirm the transitive copies remain**

```bash
npm ls test-renderer react-test-renderer react-server-dom-webpack
```

Expected: `test-renderer@1.2.0` under `@testing-library/react-native`, `react-test-renderer@19.2.3` under `jest-expo`, `react-server-dom-webpack@19.2.x` under `expo-router`/`jest-expo`. No `UNMET DEPENDENCY` / `invalid` markers.

**Fallback:** if `react-server-dom-webpack` shows as an unmet *peer* of `expo-router` (peer deps aren't auto-installed the same way), restore just that one: `npm i -D react-server-dom-webpack@~19.2.4` and keep the other three removals.

- [ ] **Step 3: Verify the test suite and typecheck**

```bash
npx jest --silent && npm run typecheck
```

Expected: `Tests: 9 passed, 9 total`; typecheck silent. (jest-expo drives react-test-renderer, so a version mismatch with react@19.2.3 would fail loudly here.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: drop unused and transitively-provided dependencies" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Deferred / explicitly out of scope

Each item below is open because it needs the user's call or collides with uncommitted work — none is answered by a recorded decision (there are none).

1. **`boh-admin/src/pages/content/ContentPage.tsx` split (1509 lines, biggest simplification target).** The user's checkout has a ~2220-line uncommitted diff on this exact file plus a new untracked `ContentPage.test.tsx`. Refactoring it now would guarantee a conflict. Revisit after that work lands; a natural split is the dnd-kit tree UI vs. the upload/mutation logic (some already lives in `contentData.ts`).
2. **`graphify-out/` in git (2.7 MB, 139 files, mostly `cache/`).** Committed deliberately in `113db33` ("graphify ran") and used by the /graphify skill. Untracking `graphify-out/cache/` would shrink the repo but changes what the user chose to version — their call, nothing else in this plan depends on it.
3. **`react/display-name` lint error in `app/(tabs)/_layout.tsx`.** Introduced by the user's uncommitted edits (the new `tabIcon()` factory returns an anonymous component); not present at HEAD. Fix belongs with that in-flight work — e.g. assign the arrow function to a named const before returning it.
4. **Duplicated `database.types.ts` / `text.ts` / `cn.ts` between mobile and admin.** Inherent to two independent npm projects in one repo; sharing would require a workspace package (new infrastructure, YAGNI now). Task 4 fixes the actual drift. If drift recurs, add a `types:gen` script that regenerates both copies in one command.
5. **Edge-function boilerplate extraction** (both functions repeat ~15 lines of `WebhookPayload` + client setup). Considered and rejected: a `_shared/` module saves fewer lines than it adds indirection.
6. **`prettier` devDeps** (flagged unused by knip in both projects). Kept: both package.jsons carry prettier config blocks used by editor format-on-save; there's just no npm script referencing it.
