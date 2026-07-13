import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { text } from "@/constants/text";
import { AddRow } from "@/components/ui";

import {
  createCourse,
  createLesson,
  createLessonResource,
  createSection,
  deleteCourse,
  deleteLesson,
  deleteLessonResource,
  deleteSection,
  fetchCourses,
  fetchLessonResources,
  fetchLessons,
  fetchSections,
  updateCourse,
  updateLesson,
  updateLessonOrders,
  updateLessonResource,
  updateSection,
  updateSectionOrders,
  uploadCourseContent,
  type Course,
  type CourseSection,
  type Lesson,
  type LessonResource,
} from "./contentData";

import {
  type CourseForm,
  type LessonForm,
  type ResourceForm,
  type SectionForm,
  CreateCourseForm,
  CreateLessonForm,
  CreateResourceForm,
  CreateSectionForm,
  LessonEditForm,
  ResourceEditForm,
  SectionEditForm,
} from "./forms";

import { CourseCard, LessonRow, ResourceRow, SectionRow } from "./components";

import { isoDateTimeOrNull, lessonsForSection, mutationMessage } from "./utils";

const emptyCourses: Course[] = [];
const emptySections: CourseSection[] = [];
const emptyLessons: Lesson[] = [];
const emptyResources: LessonResource[] = [];

export function ContentPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number | undefined>>({});

  const coursesQuery = useQuery({ queryKey: ["content", "courses"], queryFn: fetchCourses });
  const sectionsQuery = useQuery({
    queryKey: ["content", "sections", selectedCourseId],
    queryFn: () => fetchSections(selectedCourseId),
  });
  const sectionIds = useMemo(
    () => (sectionsQuery.data ?? []).map((section) => section.id),
    [sectionsQuery.data],
  );
  const lessonsQuery = useQuery({
    queryKey: ["content", "lessons", sectionIds],
    queryFn: () => fetchLessons(sectionIds),
  });
  const lessonIds = useMemo(
    () => (lessonsQuery.data ?? []).map((lesson) => lesson.id),
    [lessonsQuery.data],
  );
  const resourcesQuery = useQuery({
    queryKey: ["content", "resources", lessonIds],
    queryFn: () => fetchLessonResources(lessonIds),
  });

  const courses = coursesQuery.data ?? emptyCourses;
  const sections = sectionsQuery.data ?? emptySections;
  const lessons = lessonsQuery.data ?? emptyLessons;
  const resources = resourcesQuery.data ?? emptyResources;
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) setSelectedCourseId(courses[0].id);
  }, [courses, selectedCourseId]);

  const invalidateContent = async () => {
    await queryClient.invalidateQueries({ queryKey: ["content"] });
  };

  const runMutation = async (work: () => Promise<void>) => {
    setErrorMessage(null);
    try {
      await work();
      return true;
    } catch (error) {
      setErrorMessage(mutationMessage(error));
      return false;
    }
  };

  async function maybeUpload(
    file: File | null,
    fallbackUrl: string,
    key: string,
    folder: "videos" | "resources",
  ) {
    if (!file) return fallbackUrl.trim();
    setUploadProgress((p) => ({ ...p, [key]: 0 }));
    try {
      return await uploadCourseContent(file, folder, (fraction) => {
        setUploadProgress((p) => ({ ...p, [key]: fraction }));
      });
    } finally {
      setUploadProgress((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }
  }

  const selectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setExpandedSectionId(null);
    setExpandedLessonId(null);
    setExpandedResourceId(null);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSectionId((current) => (current === sectionId ? null : sectionId));
    setExpandedLessonId(null);
    setExpandedResourceId(null);
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessonId((current) => (current === lessonId ? null : lessonId));
    setExpandedResourceId(null);
  };

  const toggleResource = (resourceId: string) => {
    setExpandedResourceId((current) => (current === resourceId ? null : resourceId));
  };

  const addCourse = (form: CourseForm) =>
    runMutation(async () => {
      const course = await createCourse({
        title: form.title.trim(),
        start_date: form.startDate || null,
      });
      setSelectedCourseId(course.id);
      await invalidateContent();
    });

  const saveCourse = (course: Course, form: CourseForm) =>
    runMutation(async () => {
      await updateCourse(course.id, {
        title: form.title.trim(),
        start_date: form.startDate || null,
      });
      await invalidateContent();
    });

  const removeCourse = (course: Course) =>
    void runMutation(async () => {
      if (!window.confirm(text.content.confirmDeleteCourse(course.title))) return;
      await deleteCourse(course.id);
      setSelectedCourseId(null);
      await invalidateContent();
    });

  const addSection = (form: SectionForm) =>
    runMutation(async () => {
      if (!selectedCourseId) return;
      await createSection({
        course_id: selectedCourseId,
        title: form.title.trim(),
        type: form.type,
        order: sections.length,
        go_live_date: form.type === "module" ? isoDateTimeOrNull(form.goLiveDate) : null,
      });
      await invalidateContent();
    });

  const saveSection = (section: CourseSection, form: SectionForm) =>
    runMutation(async () => {
      await updateSection(section.id, {
        title: form.title.trim(),
        type: form.type,
        go_live_date: form.type === "module" ? isoDateTimeOrNull(form.goLiveDate) : null,
      });
      await invalidateContent();
    });

  const removeSection = (section: CourseSection) =>
    void runMutation(async () => {
      if (!window.confirm(text.content.confirmDeleteSection(section.title))) return;
      await deleteSection(section.id);
      setExpandedSectionId((current) => (current === section.id ? null : current));
      await invalidateContent();
    });

  const reorderSections = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    void runMutation(async () => {
      const next = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
      await updateSectionOrders(next);
      await invalidateContent();
    });
  };

  const addLesson = (sectionId: string, form: LessonForm) =>
    runMutation(async () => {
      const videoUrl = await maybeUpload(
        form.videoFile,
        form.videoUrl,
        `new-lesson-${sectionId}`,
        "videos",
      );
      await createLesson({
        section_id: sectionId,
        title: form.title.trim(),
        order: lessonsForSection(lessons, sectionId).length,
        video_url: videoUrl || null,
      });
      await invalidateContent();
    });

  const saveLesson = (lesson: Lesson, form: LessonForm) =>
    runMutation(async () => {
      const videoUrl = await maybeUpload(
        form.videoFile,
        form.videoUrl,
        `lesson-${lesson.id}`,
        "videos",
      );
      await updateLesson(lesson.id, {
        title: form.title.trim(),
        video_url: videoUrl || null,
      });
      await invalidateContent();
    });

  const removeLesson = (lesson: Lesson) =>
    void runMutation(async () => {
      if (!window.confirm(text.content.confirmDeleteLesson(lesson.title))) return;
      await deleteLesson(lesson.id);
      setExpandedLessonId((current) => (current === lesson.id ? null : current));
      await invalidateContent();
    });

  const reorderLessons = (sectionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    void runMutation(async () => {
      const sectionLessons = lessonsForSection(lessons, sectionId);
      const oldIdx = sectionLessons.findIndex((l) => l.id === active.id);
      const newIdx = sectionLessons.findIndex((l) => l.id === over.id);
      const next = arrayMove(sectionLessons, oldIdx, newIdx).map((l, i) => ({ ...l, order: i }));
      await updateLessonOrders(next);
      await invalidateContent();
    });
  };

  const addResource = (lessonId: string, form: ResourceForm) =>
    runMutation(async () => {
      const url = await maybeUpload(form.file, form.url, `new-resource-${lessonId}`, "resources");
      await createLessonResource({
        lesson_id: lessonId,
        title: form.title.trim(),
        type: form.type,
        url,
      });
      await invalidateContent();
    });

  const saveResource = (resource: LessonResource, form: ResourceForm) =>
    runMutation(async () => {
      const url = await maybeUpload(form.file, form.url, `resource-${resource.id}`, "resources");
      await updateLessonResource(resource.id, {
        title: form.title.trim(),
        type: form.type,
        url,
      });
      await invalidateContent();
    });

  const removeResource = (resource: LessonResource) =>
    void runMutation(async () => {
      if (!window.confirm(text.content.confirmDeleteResource(resource.title))) return;
      await deleteLessonResource(resource.id);
      setExpandedResourceId((current) => (current === resource.id ? null : current));
      await invalidateContent();
    });

  const queryError =
    coursesQuery.error ?? sectionsQuery.error ?? lessonsQuery.error ?? resourcesQuery.error;
  const pageError = errorMessage ?? (queryError ? mutationMessage(queryError) : null);
  const isLoading =
    coursesQuery.isLoading ||
    sectionsQuery.isLoading ||
    lessonsQuery.isLoading ||
    resourcesQuery.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{text.content.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.content.subtitle}</p>
      </header>

      {pageError ? (
        <div
          role="alert"
          className="rounded-card border border-destructive p-4 text-sm text-destructive"
        >
          <p className="font-semibold">{text.common.somethingWentWrong}</p>
          <p className="mt-1">{pageError}</p>
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-muted-foreground">{text.content.loading}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-card border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">{text.content.coursesHeading}</h2>
          <div className="space-y-2">
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{text.content.emptyCourses}</p>
            ) : null}
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                className={`block w-full rounded-card px-3 py-2 text-left text-sm ${course.id === selectedCourseId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                onClick={() => selectCourse(course.id)}
              >
                <span className="block font-medium">{course.title}</span>
                <span className="block text-xs opacity-80">
                  {course.start_date ?? text.content.noStartDate}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-4">
            <AddRow label={text.content.addCourse}>
              {(close) => <CreateCourseForm onCreate={addCourse} onClose={close} />}
            </AddRow>
          </div>
        </aside>

        <main className="space-y-6">
          {selectedCourse ? (
            <CourseCard
              key={selectedCourse.id}
              course={selectedCourse}
              onSave={(form) => saveCourse(selectedCourse, form)}
              onDelete={() => removeCourse(selectedCourse)}
            />
          ) : null}

          {selectedCourseId ? (
            <section className="space-y-4 rounded-card border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground">{text.content.sectionsHeading}</h2>

              {sections.length === 0 && !isLoading ? (
                <p className="text-sm text-muted-foreground">{text.content.emptySections}</p>
              ) : null}

              <DndContext collisionDetection={closestCenter} onDragEnd={reorderSections}>
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sections.map((section) => {
                      const sectionLessons = lessonsForSection(lessons, section.id);
                      return (
                        <SectionRow
                          key={section.id}
                          section={section}
                          lessonCount={sectionLessons.length}
                          expanded={expandedSectionId === section.id}
                          onToggle={() => toggleSection(section.id)}
                        >
                          <SectionEditForm
                            key={`${section.title}-${section.type}-${section.go_live_date ?? ""}`}
                            section={section}
                            onSave={(form) => saveSection(section, form)}
                            onDelete={() => removeSection(section)}
                          />

                          <div className="space-y-3 border-t border-border pt-4">
                            <h4 className="text-sm font-semibold text-foreground">
                              {text.content.lessonsHeading}
                            </h4>
                            {sectionLessons.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {text.content.emptyLessons}
                              </p>
                            ) : null}
                            <DndContext
                              collisionDetection={closestCenter}
                              onDragEnd={(event: DragEndEvent) => reorderLessons(section.id, event)}
                            >
                              <SortableContext
                                items={sectionLessons.map((l) => l.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {sectionLessons.map((lesson) => {
                                    const lessonResources = resources.filter(
                                      (resource) => resource.lesson_id === lesson.id,
                                    );
                                    return (
                                      <LessonRow
                                        key={lesson.id}
                                        lesson={lesson}
                                        resourceCount={lessonResources.length}
                                        expanded={expandedLessonId === lesson.id}
                                        onToggle={() => toggleLesson(lesson.id)}
                                      >
                                        <LessonEditForm
                                          key={`${lesson.title}-${lesson.video_url ?? ""}`}
                                          lesson={lesson}
                                          onSave={(form) => saveLesson(lesson, form)}
                                          onDelete={() => removeLesson(lesson)}
                                          progress={uploadProgress[`lesson-${lesson.id}`]}
                                        />

                                        <div className="space-y-3 border-t border-border pt-4">
                                          <h5 className="text-sm font-semibold text-foreground">
                                            {text.content.resourcesHeading}
                                          </h5>
                                          {lessonResources.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                              {text.content.emptyResources}
                                            </p>
                                          ) : null}
                                          {lessonResources.map((resource) => (
                                            <ResourceRow
                                              key={resource.id}
                                              resource={resource}
                                              expanded={expandedResourceId === resource.id}
                                              onToggle={() => toggleResource(resource.id)}
                                            >
                                              <ResourceEditForm
                                                key={`${resource.title}-${resource.type}-${resource.url}`}
                                                resource={resource}
                                                onSave={(form) => saveResource(resource, form)}
                                                onDelete={() => removeResource(resource)}
                                                progress={uploadProgress[`resource-${resource.id}`]}
                                              />
                                            </ResourceRow>
                                          ))}
                                          <AddRow label={text.content.addResource}>
                                            {(close) => (
                                              <CreateResourceForm
                                                onCreate={(form) => addResource(lesson.id, form)}
                                                onClose={close}
                                                progress={
                                                  uploadProgress[`new-resource-${lesson.id}`]
                                                }
                                              />
                                            )}
                                          </AddRow>
                                        </div>
                                      </LessonRow>
                                    );
                                  })}
                                </div>
                              </SortableContext>
                            </DndContext>
                            <AddRow label={text.content.addLesson}>
                              {(close) => (
                                <CreateLessonForm
                                  onCreate={(form) => addLesson(section.id, form)}
                                  onClose={close}
                                  progress={uploadProgress[`new-lesson-${section.id}`]}
                                />
                              )}
                            </AddRow>
                          </div>
                        </SectionRow>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              <AddRow label={text.content.addSection}>
                {(close) => <CreateSectionForm onCreate={addSection} onClose={close} />}
              </AddRow>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
