import { text } from "@/constants/text";
import { supabase } from "@/lib/supabase";
import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Course = Tables<"courses">;
export type CourseSection = Tables<"course_sections">;
export type Lesson = Tables<"lessons">;
export type LessonResource = Tables<"lesson_resources">;
export type SectionType = Enums<"section_type">;
export type ResourceType = Enums<"resource_type">;

export type CourseInput = Pick<TablesInsert<"courses">, "title" | "start_date">;
export type SectionInput = Pick<
  TablesInsert<"course_sections">,
  "course_id" | "type" | "title" | "order" | "go_live_date"
>;
export type LessonInput = Pick<
  TablesInsert<"lessons">,
  "section_id" | "title" | "video_url" | "order"
>;
export type ResourceInput = Pick<
  TablesInsert<"lesson_resources">,
  "lesson_id" | "title" | "type" | "url"
>;

type SupabaseResult<T> = { data: T; error: { message: string } | null };

function requireData<T>({ data, error }: SupabaseResult<T>): NonNullable<T> {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error(text.common.noData);
  return data as NonNullable<T>;
}

function requireOk({ error }: { error: { message: string } | null }) {
  if (error) throw new Error(error.message);
}

function cleanPathName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

export async function fetchCourses() {
  return requireData(
    await supabase.from("courses").select("*").order("title", { ascending: true }),
  );
}

export async function createCourse(input: CourseInput) {
  return requireData(await supabase.from("courses").insert(input).select().single());
}

export async function updateCourse(id: string, input: TablesUpdate<"courses">) {
  return requireData(await supabase.from("courses").update(input).eq("id", id).select().single());
}

export async function deleteCourse(id: string) {
  requireOk(await supabase.from("courses").delete().eq("id", id));
}

export async function fetchSections(courseId: string | null) {
  if (!courseId) return [];
  return requireData(
    await supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true }),
  );
}

export async function createSection(input: SectionInput) {
  return requireData(await supabase.from("course_sections").insert(input).select().single());
}

export async function updateSection(id: string, input: TablesUpdate<"course_sections">) {
  return requireData(
    await supabase.from("course_sections").update(input).eq("id", id).select().single(),
  );
}

export async function deleteSection(id: string) {
  requireOk(await supabase.from("course_sections").delete().eq("id", id));
}

export async function fetchLessons(sectionIds: string[]) {
  if (sectionIds.length === 0) return [];
  return requireData(
    await supabase
      .from("lessons")
      .select("*")
      .in("section_id", sectionIds)
      .order("section_id", { ascending: true })
      .order("order", { ascending: true })
      .order("created_at", { ascending: true }),
  );
}

export async function createLesson(input: LessonInput) {
  return requireData(await supabase.from("lessons").insert(input).select().single());
}

export async function updateLesson(id: string, input: TablesUpdate<"lessons">) {
  return requireData(await supabase.from("lessons").update(input).eq("id", id).select().single());
}

export async function deleteLesson(id: string) {
  requireOk(await supabase.from("lessons").delete().eq("id", id));
}

export async function fetchLessonResources(lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  return requireData(
    await supabase
      .from("lesson_resources")
      .select("*")
      .in("lesson_id", lessonIds)
      .order("created_at", { ascending: true }),
  );
}

export async function createLessonResource(input: ResourceInput) {
  return requireData(await supabase.from("lesson_resources").insert(input).select().single());
}

export async function updateLessonResource(id: string, input: TablesUpdate<"lesson_resources">) {
  return requireData(
    await supabase.from("lesson_resources").update(input).eq("id", id).select().single(),
  );
}

export async function deleteLessonResource(id: string) {
  requireOk(await supabase.from("lesson_resources").delete().eq("id", id));
}

export async function updateSectionOrders(sections: Pick<CourseSection, "id" | "order">[]) {
  await Promise.all(sections.map((section) => updateSection(section.id, { order: section.order })));
}

export async function updateLessonOrders(lessons: Pick<Lesson, "id" | "order">[]) {
  await Promise.all(lessons.map((lesson) => updateLesson(lesson.id, { order: lesson.order })));
}

export async function uploadCourseContent(file: File, folder: "videos" | "resources") {
  const path = `${folder}/${crypto.randomUUID()}-${cleanPathName(file.name)}`;
  const { data, error } = await supabase.storage.from("course-content").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data: publicUrlData } = supabase.storage.from("course-content").getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}
