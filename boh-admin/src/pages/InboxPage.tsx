import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConversationView, type InboxUser } from "@/components/ConversationView";
import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Tables } from "@/types/database.types";

type DirectMessage = Tables<"direct_messages">;

type Conversation = {
  userId: string;
  user: InboxUser;
  messages: DirectMessage[];
  latestMessage: DirectMessage;
  hasUnreadIndicator: boolean;
};

const inboxQueryKey = ["inbox"] as const;

function formatPreviewTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function userLabel(user: InboxUser) {
  return user.name || user.email || text.common.unknownUser;
}

function errorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return String(error);
}

function buildConversations({
  messages,
  users,
  staffIds,
}: {
  messages: DirectMessage[];
  users: InboxUser[];
  staffIds: Set<string>;
}): Conversation[] {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const byUser = new Map<string, DirectMessage[]>();

  for (const message of messages) {
    const senderIsStaff = staffIds.has(message.sender_id);
    const recipientIsStaff = staffIds.has(message.recipient_id);
    if (!senderIsStaff && !recipientIsStaff) continue;

    const userId = senderIsStaff ? message.recipient_id : message.sender_id;
    if (staffIds.has(userId)) continue;

    const thread = byUser.get(userId) ?? [];
    thread.push(message);
    byUser.set(userId, thread);
  }

  return Array.from(byUser.entries())
    .map(([userId, thread]) => {
      const sortedMessages = [...thread].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const latestMessage = sortedMessages[sortedMessages.length - 1];
      const user =
        usersById.get(userId) ??
        ({ id: userId, name: null, email: "", role: "user" } satisfies InboxUser);

      return {
        userId,
        user,
        messages: sortedMessages,
        latestMessage,
        hasUnreadIndicator: sortedMessages.some(
          (m) => !staffIds.has(m.sender_id) && m.read_at === null,
        ),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestMessage.created_at).getTime() -
        new Date(a.latestMessage.created_at).getTime(),
    );
}

export function InboxPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: [...inboxQueryKey, "staff"],
    queryFn: async (): Promise<InboxUser[]> => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .in("role", ["admin", "tarryn"]);
      if (error) throw error;
      return data ?? [];
    },
  });

  const staffIds = new Set(staffQuery.data?.map((user) => user.id) ?? []);
  const staffIdFilter = Array.from(staffIds).join(",");
  const staffById = new Map((staffQuery.data ?? []).map((user) => [user.id, user]));
  const tarrynId = staffQuery.data?.find((user) => user.role === "tarryn")?.id ?? null;

  const messagesQuery = useQuery({
    queryKey: [...inboxQueryKey, "messages", staffIdFilter],
    enabled: staffIds.size > 0,
    queryFn: async (): Promise<DirectMessage[]> => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.in.(${staffIdFilter}),recipient_id.in.(${staffIdFilter})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const participantIds = Array.from(
    new Set(
      (messagesQuery.data ?? [])
        .flatMap((message) => [message.sender_id, message.recipient_id])
        .filter((id) => !staffIds.has(id)),
    ),
  );
  const participantIdFilter = participantIds.join(",");

  const usersQuery = useQuery({
    queryKey: [...inboxQueryKey, "users", participantIdFilter],
    enabled: participantIds.length > 0,
    queryFn: async (): Promise<InboxUser[]> => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", participantIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const conversations = buildConversations({
    messages: messagesQuery.data ?? [],
    users: usersQuery.data ?? [],
    staffIds,
  });
  const selectedConversation =
    conversations.find((conversation) => conversation.userId === selectedUserId) ??
    conversations[0] ??
    null;

  const sendReply = useMutation({
    mutationFn: async ({ recipientId, body }: { recipientId: string; body: string }) => {
      const adminId = session?.user.id;
      if (!adminId) throw new Error(text.inbox.sessionRequired);
      if (!tarrynId) throw new Error(text.inbox.tarrynAccountMissing);

      // Replies are stored as the Tarryn account so the user always sees
      // "Tarryn" (see direct_messages_staff_send_as_tarryn policy);
      // sent_by keeps the audit trail of which admin wrote it.
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: tarrynId, recipient_id: recipientId, body, sent_by: adminId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { recipientId }) => {
      setSelectedUserId(recipientId);
      void queryClient.invalidateQueries({ queryKey: inboxQueryKey });
    },
  });

  const loadError = errorMessage(staffQuery.error ?? messagesQuery.error ?? usersQuery.error);
  const isLoading = staffQuery.isLoading || messagesQuery.isLoading || usersQuery.isLoading;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{text.inbox.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.inbox.subtitle}</p>
      </header>

      {loadError ? (
        <div className="mb-4 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {text.inbox.loadError}: {loadError}
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-muted-foreground">{text.inbox.loading}</p> : null}

      {!isLoading && conversations.length === 0 ? (
        <section className="rounded-card border border-border bg-card p-8">
          <h2 className="text-lg font-semibold text-foreground">{text.inbox.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{text.inbox.emptyBody}</p>
        </section>
      ) : null}

      {conversations.length > 0 ? (
        <div className="flex gap-6">
          <aside className="w-80 shrink-0 overflow-hidden rounded-card border border-border bg-card">
            {conversations.map((conversation) => {
              const selected = selectedConversation?.userId === conversation.userId;
              return (
                <button
                  type="button"
                  key={conversation.userId}
                  className={cn(
                    "block w-full border-b border-border px-4 py-4 text-left last:border-b-0 hover:bg-muted",
                    selected ? "bg-muted" : "bg-card",
                  )}
                  onClick={() => {
                    setSelectedUserId(conversation.userId);
                    sendReply.reset();
                    if (conversation.hasUnreadIndicator) {
                      void supabase
                        .from("direct_messages")
                        .update({ read_at: new Date().toISOString() })
                        .eq("sender_id", conversation.userId)
                        .is("read_at", null)
                        .then(() => {
                          void queryClient.invalidateQueries({ queryKey: inboxQueryKey });
                        });
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{userLabel(conversation.user)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{conversation.user.email}</p>
                    </div>
                    {conversation.hasUnreadIndicator ? (
                      <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                        {text.inbox.unread}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {conversation.latestMessage.body}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {conversation.hasUnreadIndicator ? text.inbox.latestInbound : text.inbox.latestOutbound}
                    </span>
                    <time dateTime={conversation.latestMessage.created_at}>
                      {formatPreviewTime(conversation.latestMessage.created_at)}
                    </time>
                  </div>
                </button>
              );
            })}
          </aside>

          <ConversationView
            user={selectedConversation?.user ?? null}
            messages={selectedConversation?.messages ?? []}
            staffIds={staffIds}
            staffById={staffById}
            onSend={async (body) => {
              if (!selectedConversation) return;
              await sendReply.mutateAsync({ recipientId: selectedConversation.userId, body });
            }}
            isSending={sendReply.isPending}
            sendError={errorMessage(sendReply.error)}
          />
        </div>
      ) : null}
    </div>
  );
}
