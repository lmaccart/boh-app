import type { ResourceType, SectionType } from "../contentData";

export type CourseForm = { title: string; startDate: string };
export type SectionForm = { title: string; type: SectionType; goLiveDate: string };
export type LessonForm = { title: string; videoUrl: string; videoFile: File | null };
export type ResourceForm = { title: string; type: ResourceType; url: string; file: File | null };

export const emptyCourseForm: CourseForm = { title: "", startDate: "" };
export const emptySectionForm: SectionForm = { title: "", type: "welcome", goLiveDate: "" };
export const emptyLessonForm: LessonForm = { title: "", videoUrl: "", videoFile: null };
export const emptyResourceForm: ResourceForm = { title: "", type: "pdf", url: "", file: null };
