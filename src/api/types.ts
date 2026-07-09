// Convenience row aliases over the generated Supabase types, so feature code
// imports short names instead of Tables<"...">["Row"] everywhere.
import type { Tables, Enums } from "@/types/database.types";

export type CourseRow = Tables<"courses">;
export type CourseSectionRow = Tables<"course_sections">;
export type LessonRow = Tables<"lessons">;
export type LessonResourceRow = Tables<"lesson_resources">;
export type UserProgressRow = Tables<"user_progress">;
export type FavoriteRow = Tables<"favorites">;
export type CommunityPostRow = Tables<"community_posts">;
export type PostReplyRow = Tables<"post_replies">;
export type DirectMessageRow = Tables<"direct_messages">;
export type AnnouncementRow = Tables<"announcements">;

export type SectionType = Enums<"section_type">;
export type FavoriteContentType = Enums<"favorite_content_type">;
export type DevicePlatform = Enums<"device_platform">;
