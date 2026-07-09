import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";

import { queryKeys } from "./keys";
import type { Profile } from "./profiles";
import type { DirectMessageRow } from "./types";

// The designated Tarryn account that "Reach Out Here" messages route to. There
// is no admin portal yet, so a role='tarryn' user is created manually in Studio.
export function useTarrynUser() {
  return useQuery({
    queryKey: queryKeys.tarryn,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "tarryn")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

type DmThread = {
  otherUserId: string;
  lastMessage: DirectMessageRow;
};

// Conversation list: all messages involving the current user, collapsed to one
// entry per partner with the most recent message. Partner display info is
// resolved from the profiles map in the UI. Fine at closed-beta scale.
export function useThreads() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.threads,
    enabled: !!userId,
    queryFn: async (): Promise<DmThread[]> => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const threads = new Map<string, DmThread>();
      for (const row of data ?? []) {
        const otherUserId = row.sender_id === userId ? row.recipient_id : row.sender_id;
        if (threads.has(otherUserId)) continue; // first seen = most recent
        threads.set(otherUserId, { otherUserId, lastMessage: row });
      }
      return Array.from(threads.values());
    },
  });
}

export function useThread(otherUserId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: otherUserId ? queryKeys.thread(otherUserId) : ["dm", "thread", "none"],
    enabled: !!otherUserId && !!userId,
    queryFn: async (): Promise<DirectMessageRow[]> => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", "profile", userId ?? "none"],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMessage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipientId, body }: { recipientId: string; body: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: userId, recipient_id: recipientId, body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { recipientId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.thread(recipientId) });
      qc.invalidateQueries({ queryKey: queryKeys.threads });
    },
  });
}
