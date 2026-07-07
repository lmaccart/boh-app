import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_URL = "https://api.resend.com/emails";
const TO_ADDRESSES = [
  // "tarryn@drtarrynmaccarthy.com",
  // "hereforyou@drtarrynmaccarthy.com",
  "leif@lmgroup.dev",
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
      if (recipientErr) console.error("recipient lookup error:", JSON.stringify(recipientErr));
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

    const subject = `New message from ${senderName}`;
    const bodyText = [
      `${senderName} sent you a message via the Business of Happiness app:`,
      "",
      `"${messageBody}"`,
      "",
      "Reply in the app to respond.",
    ].join("\n");

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
  } catch (err) {
    console.error("reach-out-email error:", err);
  }

  return new Response("ok", { status: 200 });
});
