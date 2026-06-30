import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

// Subscribe to inserts on a table and invalidate a query so the UI refetches
// when new rows arrive. Used by feeds, post detail, and DM threads for live
// updates. `enabled` gates the subscription until required params are ready.
export function useRealtimeInserts(
  channelName: string,
  table: "community_posts" | "post_replies" | "direct_messages",
  queryKey: readonly unknown[],
  enabled = true,
) {
  const qc = useQueryClient();
  // Serialize the key so the effect re-subscribes only when it truly changes.
  const keyId = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // queryKey is captured via keyId to keep the dependency array stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, keyId, enabled, qc]);
}
