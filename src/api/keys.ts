// Centralized TanStack Query keys so invalidation stays consistent across hooks.
export const queryKeys = {
  courses: ["courses"] as const,
  courseSections: (courseId: string) => ["courses", courseId, "sections"] as const,

  sectionLessons: (sectionId: string) => ["sections", sectionId, "lessons"] as const,
  lesson: (lessonId: string) => ["lessons", lessonId] as const,
  lessonResources: (lessonId: string) => ["lessons", lessonId, "resources"] as const,

  progress: (lessonId: string) => ["progress", lessonId] as const,
  inProgress: ["progress", "in-progress"] as const,

  favorites: ["favorites"] as const,

  posts: (courseId: string | null) => ["posts", courseId ?? "global"] as const,
  post: (postId: string) => ["posts", "detail", postId] as const,
  postReplies: (postId: string) => ["posts", postId, "replies"] as const,

  threads: ["dm", "threads"] as const,
  thread: (otherUserId: string) => ["dm", "thread", otherUserId] as const,
  tarryn: ["users", "tarryn"] as const,

  announcements: ["announcements"] as const,

  users: ["users"] as const,
} as const;
