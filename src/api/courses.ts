import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { queryKeys } from "./keys";
import type { CourseRow, CourseSectionRow } from "./types";

// RLS already restricts `courses` to whitelisted users (or staff), so a plain
// select returns exactly the courses this user may access.
export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Sections for a course. Module sections that are not yet live are filtered out
// here so go-live enforcement lives in one place. Ordering matches the intended
// on-screen grouping order.
export function useCourseSections(courseId: string | undefined) {
  return useQuery({
    queryKey: courseId ? queryKeys.courseSections(courseId) : ["courses", "none", "sections"],
    enabled: !!courseId,
    queryFn: async (): Promise<CourseSectionRow[]> => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*")
        .eq("course_id", courseId!)
        .order("order", { ascending: true });
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).filter(
        (s) => s.type !== "module" || !s.go_live_date || new Date(s.go_live_date).getTime() <= now,
      );
    },
  });
}
