import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";

import type { DevicePlatform } from "./types";

// Persist an Expo push token for the current user/device. The token is unique
// per (user, token), so re-registering the same device is idempotent. The
// actual permission + token-fetch flow lives in src/lib/push.ts (M5).
export function useRegisterPushToken() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useMutation({
    mutationFn: async ({ token, platform }: { token: string; platform: DevicePlatform }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("push_tokens")
        .upsert({ user_id: userId, token, platform }, { onConflict: "user_id,token" });
      if (error) throw error;
    },
  });
}
