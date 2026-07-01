import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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
  // Increment on each subscription so the channel name is always unique.
  // This avoids the "cannot add postgres_changes callbacks after subscribe()"
  // error that occurs when removeChannel() is async and the old channel is
  // still registered when the next effect run tries to reuse the same name.
  const instanceRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const uniqueName = `${channelName}-${++instanceRef.current}`;
    const channel = supabase
      .channel(uniqueName)
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
