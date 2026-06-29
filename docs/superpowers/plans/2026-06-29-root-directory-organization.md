# Root Directory Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce loose config files at the project root from ~10 down to 6 by inlining small configs into `package.json` and relocating non-config source files into `src/`.

**Architecture:** Inline `jest` and `prettier` configs into `package.json` (both tools natively support this), then move `global.css` and `nativewind-env.d.ts` into `src/` with corresponding path updates. No behavior changes — purely organizational.

**Tech Stack:** Expo 56, React Native, NativeWind, Jest, Prettier, TypeScript

**User decisions (already made):** "Approach A — inline jest/prettier into package.json, move global.css and nativewind-env.d.ts to src/."

---

### Task 1: Inline jest and prettier configs into package.json

**Goal:** Remove `jest.config.js` and `.prettierrc` by merging their content into `package.json`.

**Files:**
- Modify: `package.json`
- Delete: `jest.config.js`
- Delete: `.prettierrc`

**Acceptance Criteria:**
- [ ] `package.json` contains a `"jest"` key with `preset` and `setupFilesAfterEnv`
- [ ] `package.json` contains a `"prettier"` key with all five formatting options
- [ ] `jest.config.js` is deleted
- [ ] `.prettierrc` is deleted
- [ ] `npm test` runs without error

**Verify:** `npm test -- --passWithNoTests` → exits 0

**Steps:**

- [ ] **Step 1: Add jest and prettier keys to package.json**

Edit `package.json` — add after the `"devDependencies"` block:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest-setup.ts"]
},
"prettier": {
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 2: Delete the now-redundant files**

```bash
rm jest.config.js .prettierrc
```

- [ ] **Step 3: Verify jest still works**

```bash
npm test -- --passWithNoTests
```

Expected: test suite runs (passes with no tests if none exist yet).

- [ ] **Step 4: Commit**

```bash
git add package.json
git rm jest.config.js .prettierrc
git commit -m "chore: inline jest and prettier configs into package.json"
```

---

### Task 2: Move global.css to src/

**Goal:** Relocate `global.css` into `src/` and update the import in `app/_layout.tsx`.

**Files:**
- Move: `global.css` → `src/global.css`
- Modify: `app/_layout.tsx` (line 1)

**Acceptance Criteria:**
- [ ] `global.css` no longer exists at root
- [ ] `src/global.css` exists with identical content
- [ ] `app/_layout.tsx` imports from `"@/global.css"` (not `"../global.css"`)
- [ ] App builds without error (`npx expo export --platform ios --dev` or `npx expo start` launches cleanly)

**Verify:** `npx expo export --platform ios 2>&1 | tail -5` → no CSS import errors

**Steps:**

- [ ] **Step 1: Move the file**

```bash
mv global.css src/global.css
```

- [ ] **Step 2: Update the import in app/_layout.tsx**

Change line 1 from:
```ts
import "../global.css";
```
to:
```ts
import "@/global.css";
```

(`@` is aliased to `./src/*` in `tsconfig.json`.)

- [ ] **Step 3: Verify build**

```bash
npx expo export --platform ios 2>&1 | tail -5
```

Expected: bundle completes, no import resolution errors.

- [ ] **Step 4: Commit**

```bash
git add src/global.css app/_layout.tsx
git rm global.css
git commit -m "chore: move global.css into src/"
```

---

### Task 3: Move nativewind-env.d.ts to src/

**Goal:** Relocate `nativewind-env.d.ts` into `src/` and update `tsconfig.json` so TypeScript still picks it up.

**Files:**
- Move: `nativewind-env.d.ts` → `src/nativewind-env.d.ts`
- Modify: `tsconfig.json` (remove explicit `"nativewind-env.d.ts"` from `include`)

**Acceptance Criteria:**
- [ ] `nativewind-env.d.ts` no longer exists at root
- [ ] `src/nativewind-env.d.ts` exists with content `/// <reference types="nativewind/types" />`
- [ ] `tsconfig.json` include array no longer contains the bare `"nativewind-env.d.ts"` entry
- [ ] `npm run typecheck` exits 0

**Verify:** `npm run typecheck` → exits 0

**Steps:**

- [ ] **Step 1: Move the file**

```bash
mv nativewind-env.d.ts src/nativewind-env.d.ts
```

- [ ] **Step 2: Update tsconfig.json**

Remove the explicit `"nativewind-env.d.ts"` entry from the `include` array. The `**/*.ts` glob already covers `src/nativewind-env.d.ts`.

Before:
```json
"include": [
  "**/*.ts",
  "**/*.tsx",
  "nativewind-env.d.ts"
]
```

After:
```json
"include": [
  "**/*.ts",
  "**/*.tsx"
]
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm run typecheck
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/nativewind-env.d.ts tsconfig.json
git rm nativewind-env.d.ts
git commit -m "chore: move nativewind-env.d.ts into src/"
```
