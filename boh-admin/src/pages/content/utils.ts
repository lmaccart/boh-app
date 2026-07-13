import { text } from "@/constants/text";
import type { Lesson } from "./contentData";

export function mutationMessage(error: unknown) {
  return error instanceof Error ? error.message : text.content.saveError;
}

export function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function dateTimeInputValue(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

export function isoDateTimeOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function lessonsForSection(lessons: Lesson[], sectionId: string) {
  return lessons.filter((lesson) => lesson.section_id === sectionId);
}
