import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { queryKeys } from "./keys";
import type { LessonResourceRow, LessonRow } from "./types";

export function useSectionLessons(sectionId: string | undefined) {
  return useQuery({
    queryKey: sectionId ? queryKeys.sectionLessons(sectionId) : ["sections", "none", "lessons"],
    enabled: !!sectionId,
    queryFn: async (): Promise<LessonRow[]> => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("section_id", sectionId!)
        .order("order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: lessonId ? queryKeys.lesson(lessonId) : ["lessons", "none"],
    enabled: !!lessonId,
    queryFn: async (): Promise<LessonRow | null> => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: lessonId ? queryKeys.lessonResources(lessonId) : ["lessons", "none", "resources"],
    enabled: !!lessonId,
    queryFn: async (): Promise<LessonResourceRow[]> => {
      const { data, error } = await supabase
        .from("lesson_resources")
        .select("*")
        .eq("lesson_id", lessonId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
