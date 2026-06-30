import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { queryKeys } from "./keys";
import type { AnnouncementRow } from "./types";

export type AnnouncementWithCourse = AnnouncementRow & {
  course: { id: string; title: string } | null;
};

// App-wide announcements (course_id IS NULL) plus per-course announcements for
// courses the user can see. RLS already gates course-scoped rows to whitelisted
// users / staff, so a single ordered select returns the correct set.
export function useAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: async (): Promise<AnnouncementWithCourse[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, course:courses(id, title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnnouncementWithCourse[];
    },
  });
}
