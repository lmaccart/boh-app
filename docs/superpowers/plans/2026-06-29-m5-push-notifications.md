# M5: Push Notifications + Reach-Out Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Expo push token registration, deliver push notifications on admin community posts and all DMs, and email Tarryn when a user sends her a message.

**Architecture:** A `PushRegistrar` null component in `_layout.tsx` handles device token registration on login. Two Supabase Edge Functions (`notify` and `reach-out-email`) are triggered by database webhooks — `notify` fans out Expo push messages, `reach-out-email` forwards DMs to Tarryn via Resend.

**Tech Stack:** React Native, Expo (expo-notifications), Supabase Edge Functions (Deno), Expo Push API, Resend.

**User decisions (already made):**
- Email provider: Resend
- Community push notifications: admin/Tarryn posts only
- DM push notifications: all DMs (any sender → recipient)
- Edge Function trigger method: Supabase Database Webhooks (Approach A)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/PushRegistrar.tsx` | Create | Null component: request permission, fetch Expo token, persist to DB |
| `src/components/PushRegistrar.test.tsx` | Create | Unit tests for PushRegistrar |
| `app/_layout.tsx` | Modify | Render `<PushRegistrar />` when authenticated |
| `supabase/functions/notify/index.ts` | Create | Push notification fan-out for community posts + DMs |
| `supabase/functions/reach-out-email/index.ts` | Create | Email forwarding for Tarryn-bound DMs via Resend |

---

## Task 0: PushRegistrar Component

**Goal:** A null-rendering component that registers the device's Expo push token on login and persists it to Supabase.

**Files:**
- Create: `src/components/PushRegistrar.tsx`
- Create: `src/components/PushRegistrar.test.tsx`
- Modify: `app/_layout.tsx`

**Acceptance Criteria:**
- [ ] `PushRegistrar` renders null (no visible UI)
- [ ] On mount, calls `registerForPushNotifications()` from `src/lib/push`
- [ ] If a token is returned, calls `useRegisterPushToken().mutate({ token, platform })`
- [ ] If permission is denied (returns `null`), does nothing silently
- [ ] Component is mounted inside `RootNavigator` only when `session` is non-null
- [ ] `npm test` passes

**Verify:** `npm test -- --testPathPattern=PushRegistrar` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/components/PushRegistrar.test.tsx`:

```tsx
import { render, waitFor } from "@testing-library/react-native";

import { PushRegistrar } from "./PushRegistrar";

const mockMutate = jest.fn();

jest.mock("@/api", () => ({
  useRegisterPushToken: () => ({ mutate: mockMutate }),
}));

jest.mock("@/lib/push", () => ({
  registerForPushNotifications: jest.fn(),
}));

const { registerForPushNotifications } = require("@/lib/push");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PushRegistrar", () => {
  it("renders null", async () => {
    registerForPushNotifications.mockResolvedValue(null);
    const { toJSON } = await render(<PushRegistrar />);
    expect(toJSON()).toBeNull();
  });

  it("mutates with token when permission granted", async () => {
    registerForPushNotifications.mockResolvedValue({
      token: "ExponentPushToken[abc123]",
      platform: "ios",
    });
    await render(<PushRegistrar />);
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        token: "ExponentPushToken[abc123]",
        platform: "ios",
      });
    });
  });

  it("does not call mutate when permission denied", async () => {
    registerForPushNotifications.mockResolvedValue(null);
    await render(<PushRegistrar />);
    await waitFor(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=PushRegistrar
```

Expected: FAIL — `Cannot find module './PushRegistrar'`

- [ ] **Step 3: Create `src/components/PushRegistrar.tsx`**

```tsx
import { useEffect } from "react";

import { useRegisterPushToken } from "@/api";
import { registerForPushNotifications } from "@/lib/push";

export function PushRegistrar() {
  const { mutate } = useRegisterPushToken();
  useEffect(() => {
    registerForPushNotifications().then((result) => {
      if (result) mutate(result);
    });
  }, []);
  return null;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- --testPathPattern=PushRegistrar
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Wire `PushRegistrar` into `app/_layout.tsx`**

Open `app/_layout.tsx`. Add the import at the top and render the component conditionally inside `RootNavigator`. The file currently ends its `RootNavigator` return with `<Stack screenOptions={{ headerShown: false }} />`.

Add import after the existing imports block:

```tsx
import { PushRegistrar } from "@/components/PushRegistrar";
```

Inside `RootNavigator`, wrap the return in a fragment so `PushRegistrar` can sit alongside `Stack`:

```tsx
return (
  <>
    {session && <PushRegistrar />}
    <Stack screenOptions={{ headerShown: false }} />
  </>
);
```

The full updated `RootNavigator` function should look like:

```tsx
function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <>
      {session && <PushRegistrar />}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all existing tests pass (cn, Button, PushRegistrar)

- [ ] **Step 7: Commit**

```bash
git add src/components/PushRegistrar.tsx src/components/PushRegistrar.test.tsx app/_layout.tsx
git commit -m "feat(m5): add PushRegistrar — register Expo push token on login"
```

---

## Task 1: `notify` Edge Function

**Goal:** A Supabase Edge Function that sends Expo push notifications — to enrolled users when an admin/Tarryn posts in the community, and to the recipient on any new DM.

**Files:**
- Create: `supabase/functions/notify/index.ts`

**Acceptance Criteria:**
- [ ] On `community_posts` INSERT by a non-admin/non-tarryn user: returns 200, sends no push
- [ ] On `community_posts` INSERT by an admin/tarryn user with `course_id = null`: fetches all users except poster, sends push to their tokens
- [ ] On `community_posts` INSERT by an admin/tarryn user with a `course_id`: fetches only whitelisted users for that course, sends push to their tokens
- [ ] On `direct_messages` INSERT: sends push to recipient's tokens with sender's name as title
- [ ] Notification body is truncated to 100 chars; null body becomes `"New video posted"`
- [ ] Expo push requests are sent in batches of ≤ 100 tokens
- [ ] Function always returns HTTP 200 (non-fatal errors are logged, not thrown)

**Verify:** After deployment in Task 3, trigger with curl and observe Expo delivery receipts. See Task 3 for curl commands.

**Steps:**

- [ ] **Step 1: Create `supabase/functions/notify/index.ts`**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: null;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (payload.table === "community_posts") {
      await handleCommunityPost(supabase, payload.record);
    } else if (payload.table === "direct_messages") {
      await handleDirectMessage(supabase, payload.record);
    }
  } catch (err) {
    console.error("notify error:", err);
  }

  return new Response("ok", { status: 200 });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCommunityPost(supabase: any, record: Record<string, unknown>) {
  const { data: poster, error: posterErr } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", record["user_id"])
    .single();

  if (posterErr || !poster) return;
  if (!["admin", "tarryn"].includes(poster.role)) return;

  let audienceIds: string[];

  if (record["course_id"]) {
    const { data: rows } = await supabase
      .from("course_whitelist")
      .select("user_id")
      .eq("course_id", record["course_id"]);
    audienceIds = (rows ?? []).map((r: { user_id: string }) => r.user_id);
  } else {
    const { data: rows } = await supabase
      .from("users")
      .select("id")
      .neq("id", record["user_id"]);
    audienceIds = (rows ?? []).map((r: { id: string }) => r.id);
  }

  if (!audienceIds.length) return;

  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", audienceIds);

  const tokens: string[] = (tokenRows ?? []).map((r: { token: string }) => r.token);
  if (!tokens.length) return;

  const rawBody = record["body"];
  const body = rawBody
    ? String(rawBody).slice(0, 100)
    : "New video posted";

  await sendPushBatch(tokens, poster.name ?? "Tarryn", body);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDirectMessage(supabase: any, record: Record<string, unknown>) {
  const { data: sender } = await supabase
    .from("users")
    .select("name")
    .eq("id", record["sender_id"])
    .single();

  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", record["recipient_id"]);

  const tokens: string[] = (tokenRows ?? []).map((r: { token: string }) => r.token);
  if (!tokens.length) return;

  const body = String(record["body"] ?? "").slice(0, 100);
  await sendPushBatch(tokens, sender?.name ?? "Someone", body);
}

async function sendPushBatch(tokens: string[], title: string, body: string) {
  const messages = tokens.map((to) => ({ to, title, body, sound: "default" }));

  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const chunk = messages.slice(i, i + EXPO_BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error("Expo push failed:", await res.text());
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/notify/index.ts
git commit -m "feat(m5): add notify edge function — push on admin posts and DMs"
```

---

## Task 2: `reach-out-email` Edge Function

**Goal:** A Supabase Edge Function that emails Tarryn and the support inbox when a user sends a DM to an admin or Tarryn account.

**Files:**
- Create: `supabase/functions/reach-out-email/index.ts`

**Acceptance Criteria:**
- [ ] On `direct_messages` INSERT where recipient role is not `admin`/`tarryn`: returns 200, sends no email
- [ ] On `direct_messages` INSERT where recipient role is `admin`/`tarryn`: sends email via Resend to both `tarryn@drtarrynmaccarthy.com` and `hereforyou@drtarrynmaccarthy.com`
- [ ] Email subject is `New message from [Sender Name]`
- [ ] Email body includes sender name, message text, and the phrase `"Reply in the app to respond."`
- [ ] Function always returns HTTP 200 (Resend errors are logged, not thrown)

**Verify:** After deployment in Task 3, send a test DM to Tarryn and confirm email arrives. See Task 3.

**Steps:**

- [ ] **Step 1: Create `supabase/functions/reach-out-email/index.ts`**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_URL = "https://api.resend.com/emails";
const TO_ADDRESSES = [
  "tarryn@drtarrynmaccarthy.com",
  "hereforyou@drtarrynmaccarthy.com",
];

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: null;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const record = payload.record;

    const { data: recipient, error: recipientErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", record["recipient_id"])
      .single();

    if (recipientErr || !recipient) {
      return new Response("ok", { status: 200 });
    }
    if (!["admin", "tarryn"].includes(recipient.role)) {
      return new Response("ok", { status: 200 });
    }

    const { data: sender } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", record["sender_id"])
      .single();

    const senderName = sender?.name || sender?.email || "A user";
    const messageBody = String(record["body"] ?? "");

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM"),
        to: TO_ADDRESSES,
        subject: `New message from ${senderName}`,
        text: [
          `${senderName} sent you a message via the Business of Happiness app:`,
          "",
          `"${messageBody}"`,
          "",
          "Reply in the app to respond.",
        ].join("\n"),
      }),
    });

    if (!res.ok) {
      console.error("Resend error:", await res.text());
    }
  } catch (err) {
    console.error("reach-out-email error:", err);
  }

  return new Response("ok", { status: 200 });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/reach-out-email/index.ts
git commit -m "feat(m5): add reach-out-email edge function — forward DMs to Tarryn via Resend"
```

---

## Task 3: Deploy Functions, Set Secrets, Configure Webhooks

**Goal:** Deploy both Edge Functions, inject secrets, and wire three database webhooks so functions fire on real events.

**Files:** (no code files — infrastructure configuration only)

**Acceptance Criteria:**
- [ ] `supabase functions deploy notify` exits 0
- [ ] `supabase functions deploy reach-out-email` exits 0
- [ ] `RESEND_API_KEY` and `RESEND_FROM` secrets are set
- [ ] Three database webhooks are active in Supabase Dashboard
- [ ] Posting as admin in the app community delivers a push to another logged-in device
- [ ] Sending a DM to Tarryn delivers a push to the test recipient and an email to both Tarryn addresses

**Verify:** Smoke test steps below confirm end-to-end delivery.

**Steps:**

- [ ] **Step 1: Deploy both functions**

```bash
supabase functions deploy notify --no-verify-jwt
supabase functions deploy reach-out-email --no-verify-jwt
```

`--no-verify-jwt` is required because the caller is the Supabase webhook system (not an authed user). Both commands should print `Deployed` with a function URL.

- [ ] **Step 2: Set secrets**

```bash
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
supabase secrets set RESEND_FROM=notifications@thebizofhappiness.com
```

Replace `<your-resend-api-key>` with the key from [resend.com/api-keys](https://resend.com/api-keys).
`RESEND_FROM` must be a domain verified in Resend. If you haven't verified `thebizofhappiness.com` yet, use Resend's shared domain for testing: `onboarding@resend.dev` (limited to your own email only).

Confirm secrets are set:
```bash
supabase secrets list
```

Expected: both `RESEND_API_KEY` and `RESEND_FROM` appear in the output.

- [ ] **Step 3: Configure Supabase Database Webhooks**

Open Supabase Dashboard → **Database** → **Webhooks** → **Create webhook** (three times):

**Webhook 1 — notify-community:**
- Name: `notify-community`
- Table: `public.community_posts`
- Events: `INSERT`
- Type: Supabase Edge Functions
- Edge Function: `notify`

**Webhook 2 — notify-dm:**
- Name: `notify-dm`
- Table: `public.direct_messages`
- Events: `INSERT`
- Type: Supabase Edge Functions
- Edge Function: `notify`

**Webhook 3 — reach-out-dm:**
- Name: `reach-out-dm`
- Table: `public.direct_messages`
- Events: `INSERT`
- Type: Supabase Edge Functions
- Edge Function: `reach-out-email`

All three webhooks should show status **Active** after creation.

- [ ] **Step 4: Smoke test push notifications**

Log into the app on two devices (or a device + simulator with a real push token). On Device A (admin/tarryn account), create a community post. Device B should receive a push notification within a few seconds.

To confirm the `notify` function ran, check Edge Function logs in Supabase Dashboard → **Edge Functions** → **notify** → **Logs**.

- [ ] **Step 5: Smoke test reach-out email**

On a regular user account, go to DMs → tap **Reach Out Here** → send a test message. Confirm:
1. `tarryn@drtarrynmaccarthy.com` receives the email (check inbox + spam)
2. `hereforyou@drtarrynmaccarthy.com` receives the email
3. Subject is `New message from [User Name]`
4. Body contains the message text and `"Reply in the app to respond."`

Check `reach-out-email` function logs for any Resend errors if email doesn't arrive.

- [ ] **Step 6: Commit infrastructure notes**

```bash
git add -A
git commit -m "feat(m5): deploy edge functions and configure webhooks — push + email complete"
```
