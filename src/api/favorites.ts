import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";

import { queryKeys } from "./keys";
import type { FavoriteContentType, FavoriteRow } from "./types";

// A favorite resolved to something displayable + actionable. `lessonId` is set
// when the item opens in the lesson player (clips, vault audio, lessons); `url`
// is set when it opens directly (PDF/audio lesson resources).
export type ResolvedFavorite = {
  id: string;
  contentType: FavoriteContentType;
  title: string;
  lessonId: string | null;
  url: string | null;
};

export function useFavorites() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.favorites,
    enabled: !!userId,
    queryFn: async (): Promise<FavoriteRow[]> => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Resolves favorites to titles + actions by looking their content ids up across
// the lessons and lesson_resources tables (ids are globally unique, so a single
// id matches exactly one table).
export function useResolvedFavorites() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [...queryKeys.favorites, "resolved"],
    enabled: !!userId,
    queryFn: async (): Promise<ResolvedFavorite[]> => {
      const { data: favorites, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!favorites || favorites.length === 0) return [];

      const ids = favorites.map((f) => f.content_id);
      const [lessons, resources] = await Promise.all([
        supabase.from("lessons").select("id, title").in("id", ids),
        supabase.from("lesson_resources").select("id, title, url").in("id", ids),
      ]);
      if (lessons.error) throw lessons.error;
      if (resources.error) throw resources.error;

      const lessonMap = new Map((lessons.data ?? []).map((l) => [l.id, l]));
      const resourceMap = new Map((resources.data ?? []).map((r) => [r.id, r]));

      return favorites.map((f) => {
        const lesson = lessonMap.get(f.content_id);
        const resource = resourceMap.get(f.content_id);
        return {
          id: f.id,
          contentType: f.content_type,
          title: lesson?.title ?? resource?.title ?? f.content_id,
          lessonId: lesson ? lesson.id : null,
          url: resource ? resource.url : null,
        };
      });
    },
  });
}

type FavoriteTarget = { contentType: FavoriteContentType; contentId: string };

// Toggle a favorite on/off. Returns the new favorited state so callers can
// optimistically reflect it if they wish.
export function useToggleFavorite() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentType, contentId }: FavoriteTarget): Promise<boolean> => {
      if (!userId) throw new Error("Not authenticated");
      const { data: existing, error: lookupError } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: userId, content_type: contentType, content_id: contentId });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}
