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
    } else if (payload.table === "announcements") {
      await handleAnnouncement(supabase, payload.record);
    }
  } catch (err) {
    console.error("notify error:", err);
  }

  return new Response("ok", { status: 200 });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAnnouncement(supabase: any, record: Record<string, unknown>) {
  let audienceIds: string[];

  if (record["course_id"]) {
    const { data: rows } = await supabase
      .from("course_whitelist")
      .select("user_id")
      .eq("course_id", record["course_id"]);
    audienceIds = (rows ?? []).map((r: { user_id: string }) => r.user_id);
  } else {
    const { data: rows } = await supabase.from("users").select("id");
    audienceIds = (rows ?? []).map((r: { id: string }) => r.id);
  }

  if (!audienceIds.length) return;

  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", audienceIds);

  const tokens: string[] = (tokenRows ?? []).map((r: { token: string }) => r.token);
  if (!tokens.length) return;

  const body = String(record["body"] ?? "").slice(0, 100);
  await sendPushBatch(tokens, "Business of Happiness", body);
}

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
  const body = rawBody ? String(rawBody).slice(0, 100) : "New video posted";

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
