# Ship v1 Reach Out Here Without an Email Provider

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1 with zero outbound email for "Reach Out Here" — no Resend, no FunnelBreezy — by making the email path an explicit, code-enforced no-op, and record this as a documented deviation from REQUIREMENTS.md.

**Architecture:** `supabase/functions/reach-out-email/index.ts` currently defaults to attempting Resend whenever `EMAIL_PROVIDER` is not `"funnelbreezy"` (`Deno.env.get("EMAIL_PROVIDER") ?? "resend"`). Flip that default so nothing is sent unless `EMAIL_PROVIDER` is explicitly `"resend"` or `"funnelbreezy"`; any other value (including today's remote value, which we cannot read back) hits a no-op branch before any outbound `fetch`. Then explicitly set the remote secret and redeploy, so behavior is correct regardless of whether a dashboard-configured Database Webhook already fires this function on `direct_messages` inserts (this is not tracked in migrations, so its existence can't be confirmed from the CLI). In-app delivery of the message — the actual "Reach Out Here" UX — does not depend on this function at all: `src/api/messages.ts` writes straight to `direct_messages` via the Supabase client, so it is unaffected either way.

**Tech Stack:** Deno edge function (existing code), Supabase CLI (secrets/deploy), markdown docs.

**Global Constraints:**
- Do not touch the `notify` push-notification function, its Vault secrets, or its DB triggers (`supabase/migrations/20260702000001_notify_triggers.sql`) — out of scope, must keep working exactly as-is.
- Do not delete the `RESEND_API_KEY` / `RESEND_FROM` remote secrets — leave them dormant so a post-launch flip back to email is a one-line `supabase secrets set EMAIL_PROVIDER=resend`, no redeploy needed (matches the rollback pattern already documented in the original launch-readiness plan).
- Any command that touches the remote Supabase project (`rvznhgubzjublttmqudh`) requires explicit user approval before it runs (standing rule; see memory `test-against-remote-supabase`).

**User decisions (already made):**
- Ship v1 with no email provider at all for the Reach Out Here email-out requirement in REQUIREMENTS.md ("send the message to tarryn@... and hereforyou@..."); deferred post-launch by owner decision, 2026-08-08. In-app-only delivery (visible in the admin/Tarryn DM inbox) is acceptable for v1.
- This supersedes the "Production email path is FunnelBreezy" decision recorded in `docs/superpowers/plans/2026-07-14-launch-readiness.md` (2026-07-14) — that decision predates this one.

---

### Task 1: Make "no provider configured" the safe default in the edge function

**Goal:** `reach-out-email` makes no outbound HTTP call unless `EMAIL_PROVIDER` is exactly `"resend"` or `"funnelbreezy"`.

**Files:**
- Modify: `supabase/functions/reach-out-email/index.ts`

**Acceptance Criteria:**
- [ ] The line `Deno.env.get("EMAIL_PROVIDER") ?? "resend"` no longer exists (no silent default to Resend)
- [ ] There are exactly three branches on `provider`: `"funnelbreezy"`, `"resend"`, and an `else` that makes no `fetch` call and only logs
- [ ] File still parses (Deno-style TS; no syntax errors)

**Verify:** `grep -n '?? "resend"' supabase/functions/reach-out-email/index.ts` → no output. `grep -c 'console.log("reach-out-email' supabase/functions/reach-out-email/index.ts` → `1`

**Steps:**

- [ ] **Step 1: Edit the provider dispatch**

Replace this block in `supabase/functions/reach-out-email/index.ts`:

```ts
    const provider = Deno.env.get("EMAIL_PROVIDER") ?? "resend";

    if (provider === "funnelbreezy") {
      const res = await fetch(Deno.env.get("FUNNELBREEZY_WEBHOOK_URL")!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: senderName,
          sender_email: sender?.email ?? "",
          message: messageBody,
          subject,
          body_text: bodyText,
        }),
      });

      if (!res.ok) {
        console.error("FunnelBreezy error:", await res.text());
      }
    } else {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM"),
          to: TO_ADDRESSES,
          subject,
          text: bodyText,
        }),
      });

      if (!res.ok) {
        console.error("Resend error:", await res.text());
      }
    }
```

with:

```ts
    const provider = Deno.env.get("EMAIL_PROVIDER");

    if (provider === "funnelbreezy") {
      const res = await fetch(Deno.env.get("FUNNELBREEZY_WEBHOOK_URL")!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: senderName,
          sender_email: sender?.email ?? "",
          message: messageBody,
          subject,
          body_text: bodyText,
        }),
      });

      if (!res.ok) {
        console.error("FunnelBreezy error:", await res.text());
      }
    } else if (provider === "resend") {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM"),
          to: TO_ADDRESSES,
          subject,
          text: bodyText,
        }),
      });

      if (!res.ok) {
        console.error("Resend error:", await res.text());
      }
    } else {
      // v1 ships without an email provider (owner decision, 2026-08-08); the
      // message is already delivered in-app via the direct_messages insert.
      console.log("reach-out-email: no EMAIL_PROVIDER configured, skipping send");
    }
```

- [ ] **Step 2: Verify**

Run: `grep -n '?? "resend"' supabase/functions/reach-out-email/index.ts`
Expected: no output (exit code 1)

Run: `grep -c 'console.log("reach-out-email' supabase/functions/reach-out-email/index.ts`
Expected: `1`

If `deno` is installed: `deno check supabase/functions/reach-out-email/index.ts` → no errors. If not installed, skip; this is a straightforward control-flow edit.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/reach-out-email/index.ts
git commit -m "fix(email): require explicit EMAIL_PROVIDER, default to no-op for v1"
```

---

### Task 2: Deploy the change and disable the remote provider (USER APPROVAL REQUIRED)

**Goal:** The remote `reach-out-email` function runs the Task 1 code, and the remote `EMAIL_PROVIDER` secret is set to a value that guarantees the no-op branch, regardless of what it's currently set to (its value can't be read back via `supabase secrets list`, only that it exists, last updated 2026-07-06).

**Files:**
- None — remote configuration only. Depends on Task 1's commit.

**Acceptance Criteria:**
- [ ] `supabase secrets list` shows `EMAIL_PROVIDER` with an `updated_at` timestamp of today
- [ ] `supabase functions list` shows `reach-out-email` as `ACTIVE` with a version/`updated_at` newer than the current one (version 9, 2026-07-06T ~19:58 per the last check)
- [ ] User explicitly approved the commands below before they ran

**Verify:** `supabase functions list` → `reach-out-email` version incremented, updated today

**Steps:**

- [ ] **Step 1: STOP — get explicit approval, then run**

```bash
supabase secrets set EMAIL_PROVIDER=none
supabase functions deploy reach-out-email
```

(`RESEND_API_KEY` and `RESEND_FROM` are left untouched and dormant — Task 1's code means they're simply never read while `EMAIL_PROVIDER=none`. `FUNNELBREEZY_WEBHOOK_URL` was never set, so nothing to clean up there.)

- [ ] **Step 2: Verify**

```bash
supabase secrets list
supabase functions list
```

Expected: `EMAIL_PROVIDER` updated today; `reach-out-email` `ACTIVE` with a version bump.

- [ ] **Step 3: Live smoke check**

Send a "Reach Out Here" message from a test account in the app. Confirm:
1. The message appears in the admin/Tarryn in-app DM inbox (this path is independent of the edge function and should already work).
2. No email arrives at either `drtarrynmaccarthy.com` address.
3. If the Supabase dashboard's function logs are reachable (Functions → reach-out-email → Logs), confirm a `reach-out-email: no EMAIL_PROVIDER configured, skipping send` line appears for the test message — this is the strongest signal the no-op path actually ran (as opposed to the function simply never being invoked because no Database Webhook exists).

---

### Task 3: Record the deviation and refresh docs

**Goal:** REQUIREMENTS.md, README.md, FOR_PROD.md, and the original launch-readiness plan all accurately state that v1 ships Reach Out Here as in-app-only, with no outbound email, as an explicit recorded owner decision — mirroring how the SSO deferral was already recorded.

**Files:**
- Modify: `REQUIREMENTS.md`
- Modify: `README.md`
- Modify: `FOR_PROD.md` (rewrite)
- Modify: `docs/superpowers/plans/2026-07-14-launch-readiness.md`

**Acceptance Criteria:**
- [ ] `REQUIREMENTS.md` has a sub-bullet under the Reach Out Here email requirement recording the 2026-08-08 deferral
- [ ] `README.md` no longer states that Reach Out Here messages are forwarded via Resend as current behavior
- [ ] `FOR_PROD.md` no longer lists FunnelBreezy/Resend inputs as launch blockers, and Task 9's device checklist no longer requires an email to arrive
- [ ] `docs/superpowers/plans/2026-07-14-launch-readiness.md` Task 5 and Task 9 reflect the new reality (or point to this plan)

**Verify:** `grep -c 'deferred' REQUIREMENTS.md` → `2` (SSO + email). `grep -c 'FunnelBreezy inbound-webhook URL\|verified Resend sender' FOR_PROD.md` → `0`

**Steps:**

- [ ] **Step 1: Amend REQUIREMENTS.md**

In `### Community`, under:

```markdown
  - Upon this inbox recieving a message, send the message to <tarryn@drtarrynmaccarthy.com> and <hereforyou@drtarrynmaccarthy.com>
    - this is one way, and can be done via email or in the app, and the user will receive a notification when Tarryn/admin responds (which they will do via the app)
    - done with a supabase function that calls an email provider
```

add a fourth sub-bullet:

```markdown
    - Email delivery deferred to post-launch by owner decision (2026-08-08); v1 delivers Reach Out Here messages in-app only (admin/Tarryn DM inbox), no outbound email to either address
```

- [ ] **Step 2: Amend README.md**

Line 32, replace:
```markdown
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Database Webhooks) with Resend for outbound email
```
with:
```markdown
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Database Webhooks); outbound email (Resend/FunnelBreezy) deferred post-launch — see REQUIREMENTS.md
```

Line 48 paragraph, replace:
```markdown
The DM inbox always shows a Reach Out Here button that messages Tarryn. Behind the scenes the thread is visible to all staff, and a database webhook fires the `reach-out-email` edge function, which forwards the message via Resend to `tarryn@drtarrynmaccarthy.com` and `hereforyou@drtarrynmaccarthy.com`. Staff replies from the admin portal are sent as the Tarryn account (RLS policy `direct_messages_staff_send_as_tarryn`).
```
with:
```markdown
The DM inbox always shows a Reach Out Here button that messages Tarryn. The thread is visible to all staff in-app. The `reach-out-email` edge function exists to forward the message via email to `tarryn@drtarrynmaccarthy.com` and `hereforyou@drtarrynmaccarthy.com`, but is disabled for v1 (`EMAIL_PROVIDER=none`) by owner decision — see REQUIREMENTS.md. Staff replies from the admin portal are sent as the Tarryn account (RLS policy `direct_messages_staff_send_as_tarryn`).
```

Line 99, replace:
```markdown
`reach-out-email` requires `RESEND_API_KEY` and `RESEND_FROM` (a verified Resend domain) as function secrets, plus database webhooks wired to the `direct_messages`, `announcements`, and `community_posts` tables. Production setup steps are tracked in `FOR_PROD.md`.
```
with:
```markdown
`reach-out-email` is disabled for v1 (`EMAIL_PROVIDER=none`, see REQUIREMENTS.md). To re-enable post-launch: set `EMAIL_PROVIDER=resend` plus `RESEND_API_KEY`/`RESEND_FROM` (already set as dormant secrets), or `EMAIL_PROVIDER=funnelbreezy` plus `FUNNELBREEZY_WEBHOOK_URL`, then redeploy. The `notify` push function and its `announcements`/`community_posts`/`direct_messages` triggers are unaffected.
```

- [ ] **Step 3: Rewrite FOR_PROD.md**

Replace the whole file with:

```markdown
# Remaining before store submission

Status as of 2026-08-08: Tasks 1-4, 6, 7, 8 of
`docs/superpowers/plans/2026-07-14-launch-readiness.md` are done. Task 5 is
done in its v1 form (see `docs/superpowers/plans/2026-08-08-v1-no-email-provider.md`
— Reach Out Here ships in-app only for v1, no email provider configured).
One task remains.

## Task 9: Production builds and launch verification

Not started. Needs:

- [ ] `eas build --platform ios --profile production` and
      `eas build --platform android --profile production` — both green
      (first run is interactive, user drives Apple/Android credential prompts)
- [ ] Download the .ipa, unzip, `codesign -d --entitlements - <extracted .app>`
      — confirm `aps-environment=production` (committed entitlements file
      says development; distribution signing must swap it)
- [ ] TestFlight (iOS) / Play internal testing (Android) with two real
      accounts, on real devices:
  - [ ] Sign-in works on both platforms
  - [ ] A DM from another account produces a push notification (app backgrounded)
  - [ ] Reach Out Here message appears in the admin/Tarryn in-app inbox
        (no email is sent for v1 — this is expected, see REQUIREMENTS.md)
  - [ ] An announcement posted from https://boh-admin.vercel.app produces a
        push on both devices
- [ ] Do not submit for store review with any of the above failing

## App store submission (not yet a plan task — do after Task 9 is green)

- [ ] App Store Connect: create the app record, upload screenshots, set
      privacy nutrition labels (accounts, user content, photos/videos), link
      privacy policy at https://thebizofhappiness.com/legal/#privacy
- [ ] Play Console: create the app, complete the Data safety form, upload
      assets

## Post-launch (explicitly deferred, not blocking)

- [ ] Implement social SSO (deferred 2026-07-14 by owner decision — see
      REQUIREMENTS.md)
- [ ] Add an email provider for Reach Out Here (deferred 2026-08-08 by owner
      decision — see REQUIREMENTS.md). To enable: `supabase secrets set
      EMAIL_PROVIDER=resend` (Resend secrets are already set, just dormant) or
      `EMAIL_PROVIDER=funnelbreezy` plus `FUNNELBREEZY_WEBHOOK_URL`; no
      redeploy needed, env is read per-request.
```

- [ ] **Step 4: Amend the original launch-readiness plan**

In `docs/superpowers/plans/2026-07-14-launch-readiness.md`:

Under **User decisions (already made)**, replace:
```markdown
- Production email path is FunnelBreezy (`EMAIL_PROVIDER=funnelbreezy`); Resend stays configured as fallback.
```
with:
```markdown
- Production email path is FunnelBreezy (`EMAIL_PROVIDER=funnelbreezy`); Resend stays configured as fallback. **Superseded 2026-08-08:** v1 ships with no email provider at all — see `docs/superpowers/plans/2026-08-08-v1-no-email-provider.md`.
```

At the top of **### Task 5**, immediately under the `**Goal:**` line, insert:
```markdown
> **Superseded 2026-08-08** — see `docs/superpowers/plans/2026-08-08-v1-no-email-provider.md`. v1 ships with `EMAIL_PROVIDER=none`; the FunnelBreezy/Resend setup steps below were not carried out.
```

In **### Task 9**, in the **Acceptance Criteria** list, replace:
```markdown
- [ ] On a real iOS device (TestFlight) and a real Android device (Play internal testing): sign in works, a DM sent from another account produces a push notification, and "Reach Out Here" produces an email at both drtarrynmaccarthy.com addresses
```
with:
```markdown
- [ ] On a real iOS device (TestFlight) and a real Android device (Play internal testing): sign in works, a DM sent from another account produces a push notification, and "Reach Out Here" delivers the message to the admin/Tarryn in-app inbox (no email — deferred post-launch, see REQUIREMENTS.md)
```

And in the **Steps** section, Step 3's numbered list item 3, replace:
```markdown
3. A taps "Reach Out Here", sends a message → user confirms email arrived at both Tarryn inboxes.
```
with:
```markdown
3. A taps "Reach Out Here", sends a message → user confirms it appears in the admin/Tarryn in-app inbox (no email for v1).
```

- [ ] **Step 5: Verify and commit**

Run: `grep -c 'deferred' REQUIREMENTS.md` → `2`
Run: `grep -c 'FunnelBreezy inbound-webhook URL\|verified Resend sender' FOR_PROD.md` → `0`

```bash
git add REQUIREMENTS.md README.md FOR_PROD.md docs/superpowers/plans/2026-07-14-launch-readiness.md
git commit -m "docs: record v1 email-provider deferral for Reach Out Here"
```

---

## Out of scope (explicitly)

- Removing the `RESEND_API_KEY`/`RESEND_FROM`/`FUNNELBREEZY_WEBHOOK_URL` secrets — left dormant for a fast post-launch flip
- Any change to the `notify` push-notification function or its triggers
- Actually configuring an email provider post-launch (tracked as a FOR_PROD.md post-launch item, not this plan)
- Confirming/removing whatever dashboard-only Database Webhook may or may not already exist for `reach-out-email` — the code-level no-op makes this unnecessary to resolve
