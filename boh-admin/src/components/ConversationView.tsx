import { useState } from "react";
import type { FormEvent } from "react";

import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import type { Tables } from "@/types/database.types";

type DirectMessage = Tables<"direct_messages">;

export type InboxUser = Pick<Tables<"users">, "id" | "name" | "email" | "role">;

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayName(user: InboxUser) {
  return user.name || user.email || text.common.unknownUser;
}

export function ConversationView({
  user,
  messages,
  staffIds,
  staffById,
  onSend,
  isSending,
  sendError,
}: {
  user: InboxUser | null;
  messages: DirectMessage[];
  staffIds: Set<string>;
  staffById: Map<string, InboxUser>;
  onSend: (body: string) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
}) {
  const [draft, setDraft] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;

    await onSend(body);
    setDraft("");
  }

  if (!user) {
    return (
      <section className="flex min-h-[540px] flex-1 items-center justify-center rounded-card border border-border bg-card p-8 text-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{text.conversation.emptyTitle}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text.conversation.emptyBody}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[540px] flex-1 flex-col rounded-card border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">{displayName(user)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((message) => {
          const fromStaff = staffIds.has(message.sender_id);
          const author = message.sent_by ? staffById.get(message.sent_by) : undefined;
          return (
            <article
              key={message.id}
              className={cn(
                "max-w-[72%] rounded-card px-4 py-3",
                fromStaff
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "mr-auto border border-border bg-background text-foreground",
              )}
            >
              <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
              <p
                className={cn(
                  "mt-2 text-xs",
                  fromStaff ? "text-primary-foreground/75" : "text-muted-foreground",
                )}
              >
                {formatTimestamp(message.created_at)}
                {author ? ` - ${text.conversation.sentByPrefix} ${displayName(author)}` : null}
              </p>
            </article>
          );
        })}
      </div>

      <form className="border-t border-border p-4" onSubmit={submit}>
        <label className="text-sm font-medium text-foreground" htmlFor="inbox-reply">
          {text.conversation.replyLabel}
        </label>
        <div className="mt-2 flex items-end gap-3">
          <textarea
            id="inbox-reply"
            className="min-h-24 flex-1 rounded-card border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder={text.conversation.replyPlaceholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="rounded-card bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!draft.trim() || isSending}
          >
            {isSending ? text.conversation.sending : text.conversation.send}
          </button>
        </div>
        {sendError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {text.conversation.mutationError}: {sendError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
