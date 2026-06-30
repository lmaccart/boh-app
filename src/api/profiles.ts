import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;

// All member profiles (id, name, avatar_url, role) via the privacy-narrow
// `profiles` view. Loaded once and cached; feeds, replies, and DM lists resolve
// author/partner display info from this list instead of embedding joins.
export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Convenience: a lookup map keyed by user id for O(1) resolution in lists.
export function useProfileMap() {
  const query = useProfiles();
  const map = new Map<string, Profile>();
  for (const p of query.data ?? []) map.set(p.id, p);
  return { ...query, map };
}
