import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";

import { queryKeys } from "./keys";
import type { LessonRow, UserProgressRow } from "./types";

export function useLessonProgress(lessonId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: lessonId ? queryKeys.progress(lessonId) : ["progress", "none"],
    enabled: !!lessonId && !!userId,
    queryFn: async (): Promise<UserProgressRow | null> => {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId!)
        .eq("lesson_id", lessonId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// In-progress lessons for the "Hop back in" section: started but not completed,
// most recently watched first, joined to the lesson for display + navigation.
export type InProgressLesson = UserProgressRow & { lesson: LessonRow | null };

export function useInProgressLessons() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.inProgress,
    enabled: !!userId,
    queryFn: async (): Promise<InProgressLesson[]> => {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*, lesson:lessons(*)")
        .eq("user_id", userId!)
        .is("completed_at", null)
        .gt("position_seconds", 0)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InProgressLesson[];
    },
  });
}

// Upsert the current playback position. Callers debounce this (see VideoPlayer)
// so we are not writing on every frame. Existing completed_at is preserved.
export function useSaveProgress() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, positionSeconds }: { lessonId: string; positionSeconds: number }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_progress")
        .upsert(
          { user_id: userId, lesson_id: lessonId, position_seconds: positionSeconds, updated_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
      if (error) throw error;
    },
    onSuccess: (_data, { lessonId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.progress(lessonId) });
      qc.invalidateQueries({ queryKey: queryKeys.inProgress });
    },
  });
}

// Mark a lesson complete and auto-unlock its PDF/audio resources into Resources
// by creating favorites for them. Favorites use a unique (user, type, content)
// constraint, so duplicate inserts are ignored.
export function useCompleteLesson() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const { error: progressError } = await supabase
        .from("user_progress")
        .upsert(
          { user_id: userId, lesson_id: lessonId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { onConflict: "user_id,lesson_id" },
        );
      if (progressError) throw progressError;

      const { data: resources, error: resourcesError } = await supabase
        .from("lesson_resources")
        .select("id, type")
        .eq("lesson_id", lessonId);
      if (resourcesError) throw resourcesError;

      if (resources && resources.length > 0) {
        const favorites = resources.map((r) => ({
          user_id: userId,
          content_type: r.type, // "pdf" | "audio" map directly onto favorite_content_type
          content_id: r.id,
        }));
        const { error: favError } = await supabase
          .from("favorites")
          .upsert(favorites, { onConflict: "user_id,content_type,content_id", ignoreDuplicates: true });
        if (favError) throw favError;
      }
    },
    onSuccess: (_data, lessonId) => {
      qc.invalidateQueries({ queryKey: queryKeys.progress(lessonId) });
      qc.invalidateQueries({ queryKey: queryKeys.inProgress });
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}
