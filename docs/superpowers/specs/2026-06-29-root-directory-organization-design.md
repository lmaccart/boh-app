---
title: Root Directory Organization
date: 2026-06-29
status: approved
---

## Goal

Reduce loose config files at the project root from ~10 down to 6 by inlining small configs into `package.json` and moving non-config source files into `src/`.

## Changes

### 1. Inline jest config into package.json

Add `"jest"` key to `package.json`:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest-setup.ts"]
}
```

Delete `jest.config.js`.

### 2. Inline prettier config into package.json

Add `"prettier"` key to `package.json`:

```json
"prettier": {
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Delete `.prettierrc`.

### 3. Move global.css to src/

- Move `global.css` → `src/global.css`
- Update import in `app/_layout.tsx`: `"../global.css"` → `"@/global.css"`

### 4. Move nativewind-env.d.ts to src/

- Move `nativewind-env.d.ts` → `src/nativewind-env.d.ts`
- Remove explicit `"nativewind-env.d.ts"` entry from `tsconfig.json` include array — `**/*.ts` already covers it

## Files Locked to Root (not moved)

`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `eslint.config.js`, `app.json`, `eas.json` — all required at root by their respective tools.

## Result

Root loses 4 files. `npm test`, `npx prettier`, and NativeWind type resolution are unaffected.
