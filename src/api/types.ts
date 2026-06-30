// Convenience row aliases over the generated Supabase types, so feature code
// imports short names instead of Tables<"...">["Row"] everywhere.
import type { Tables, TablesInsert, Enums } from "@/types/database.types";

export type UserRow = Tables<"users">;
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
export type PushTokenRow = Tables<"push_tokens">;

export type CommunityPostInsert = TablesInsert<"community_posts">;
export type PostReplyInsert = TablesInsert<"post_replies">;
export type DirectMessageInsert = TablesInsert<"direct_messages">;

export type SectionType = Enums<"section_type">;
export type ResourceType = Enums<"resource_type">;
export type FavoriteContentType = Enums<"favorite_content_type">;
export type UserRole = Enums<"user_role">;
export type DevicePlatform = Enums<"device_platform">;
