import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { text } from "@/constants/text";
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
  type ResourceType,
  type SectionType,
} from "./contentData";


const sectionTypes: SectionType[] = ["welcome", "nsr", "meditation", "module", "live"];
const resourceTypes: ResourceType[] = ["pdf", "audio"];
const emptyCourses: Course[] = [];
const emptySections: CourseSection[] = [];
const emptyLessons: Lesson[] = [];
const emptyResources: LessonResource[] = [];

type CourseForm = { title: string; startDate: string };
type SectionForm = { title: string; type: SectionType; order: string; goLiveDate: string };
type LessonForm = { title: string; order: string; videoUrl: string; videoFile: File | null };
type ResourceForm = { title: string; type: ResourceType; url: string; file: File | null };

const emptyCourseForm: CourseForm = { title: "", startDate: "" };
const emptySectionForm: SectionForm = {
  title: "",
  type: "welcome",
  order: "0",
  goLiveDate: "",
};
const emptyLessonForm: LessonForm = { title: "", order: "0", videoUrl: "", videoFile: null };
const emptyResourceForm: ResourceForm = { title: "", type: "pdf", url: "", file: null };

function mutationMessage(error: unknown) {
  return error instanceof Error ? error.message : text.content.saveError;
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function dateTimeInputValue(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function isoDateTimeOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function orderValue(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Button({
  children,
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const classes = {
    primary: "bg-primary text-primary-foreground hover:bg-brand-600",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    danger: "border border-destructive text-destructive hover:bg-destructive/10",
  };

  return (
    <button
      {...props}
      className={`rounded-card px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-card border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

export function ContentPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm);
  const [courseEditForm, setCourseEditForm] = useState<CourseForm>(emptyCourseForm);
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm);
  const [sectionEdits, setSectionEdits] = useState<Record<string, SectionForm>>({});
  const [lessonForms, setLessonForms] = useState<Record<string, LessonForm>>({});
  const [lessonEdits, setLessonEdits] = useState<Record<string, LessonForm>>({});
  const [resourceForms, setResourceForms] = useState<Record<string, ResourceForm>>({});
  const [resourceEdits, setResourceEdits] = useState<Record<string, ResourceForm>>({});

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

  useEffect(() => {
    if (selectedCourse) {
      setCourseEditForm({
        title: selectedCourse.title,
        startDate: dateInputValue(selectedCourse.start_date),
      });
    }
  }, [selectedCourse]);

  useEffect(() => {
    setSectionEdits(
      Object.fromEntries(
        sections.map((section) => [
          section.id,
          {
            title: section.title,
            type: section.type,
            order: String(section.order),
            goLiveDate: dateTimeInputValue(section.go_live_date),
          },
        ]),
      ),
    );
    setSectionForm((form) => ({ ...form, order: String(sections.length) }));
  }, [sections]);

  useEffect(() => {
    setLessonEdits(
      Object.fromEntries(
        lessons.map((lesson) => [
          lesson.id,
          {
            title: lesson.title,
            order: String(lesson.order),
            videoUrl: lesson.video_url ?? "",
            videoFile: null,
          },
        ]),
      ),
    );
    setLessonForms((forms) =>
      Object.fromEntries(
        sections.map((section) => [
          section.id,
          forms[section.id] ?? {
            ...emptyLessonForm,
            order: String(lessonsForSection(lessons, section.id).length),
          },
        ]),
      ),
    );
  }, [lessons, sections]);

  useEffect(() => {
    setResourceEdits(
      Object.fromEntries(
        resources.map((resource) => [
          resource.id,
          { title: resource.title, type: resource.type, url: resource.url, file: null },
        ]),
      ),
    );
    setResourceForms((forms) =>
      Object.fromEntries(
        lessons.map((lesson) => [lesson.id, forms[lesson.id] ?? emptyResourceForm]),
      ),
    );
  }, [lessons, resources]);

  const invalidateCourses = async () => {
    await queryClient.invalidateQueries({ queryKey: ["content"] });
  };

  const runMutation = async (work: () => Promise<void>) => {
    setErrorMessage(null);
    try {
      await work();
    } catch (error) {
      setErrorMessage(mutationMessage(error));
    }
  };

  const courseMutation = useMutation({ mutationFn: invalidateCourses });

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runMutation(async () => {
      const course = await createCourse({
        title: courseForm.title.trim(),
        start_date: courseForm.startDate || null,
      });
      setCourseForm(emptyCourseForm);
      setSelectedCourseId(course.id);
      await courseMutation.mutateAsync();
    });
  }

  async function submitCourseEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;
    await runMutation(async () => {
      await updateCourse(selectedCourse.id, {
        title: courseEditForm.title.trim(),
        start_date: courseEditForm.startDate || null,
      });
      await courseMutation.mutateAsync();
    });
  }

  async function submitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) return;
    await runMutation(async () => {
      await createSection({
        course_id: selectedCourseId,
        title: sectionForm.title.trim(),
        type: sectionForm.type,
        order: orderValue(sectionForm.order),
        go_live_date: sectionForm.type === "module" ? isoDateTimeOrNull(sectionForm.goLiveDate) : null,
      });
      setSectionForm({ ...emptySectionForm, order: String(sections.length + 1) });
      await courseMutation.mutateAsync();
    });
  }

  async function submitLesson(sectionId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = lessonForms[sectionId] ?? emptyLessonForm;
    await runMutation(async () => {
      const videoUrl = await maybeUpload(form.videoFile, form.videoUrl, `new-lesson-${sectionId}`, "videos");
      await createLesson({
        section_id: sectionId,
        title: form.title.trim(),
        order: orderValue(form.order),
        video_url: videoUrl || null,
      });
      setLessonForms((forms) => ({ ...forms, [sectionId]: emptyLessonForm }));
      await courseMutation.mutateAsync();
    });
  }

  async function submitResource(lessonId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = resourceForms[lessonId] ?? emptyResourceForm;
    await runMutation(async () => {
      const url = await maybeUpload(form.file, form.url, `new-resource-${lessonId}`, "resources");
      await createLessonResource({
        lesson_id: lessonId,
        title: form.title.trim(),
        type: form.type,
        url,
      });
      setResourceForms((forms) => ({ ...forms, [lessonId]: emptyResourceForm }));
      await courseMutation.mutateAsync();
    });
  }

  async function maybeUpload(
    file: File | null,
    fallbackUrl: string,
    key: string,
    folder: "videos" | "resources",
  ) {
    if (!file) return fallbackUrl.trim();
    setUploadingKey(key);
    try {
      return await uploadCourseContent(file, folder);
    } finally {
      setUploadingKey(null);
    }
  }

  const pageError =
    errorMessage ??
    mutationMessage(coursesQuery.error ?? sectionsQuery.error ?? lessonsQuery.error ?? resourcesQuery.error);
  const isLoading =
    coursesQuery.isLoading || sectionsQuery.isLoading || lessonsQuery.isLoading || resourcesQuery.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{text.content.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.content.subtitle}</p>
      </header>

      {pageError ? (
        <div role="alert" className="rounded-card border border-destructive p-4 text-sm text-destructive">
          <p className="font-semibold">{text.common.somethingWentWrong}</p>
          <p className="mt-1">{pageError}</p>
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-muted-foreground">{text.content.loading}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-card border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">{text.content.coursesHeading}</h2>
          <form className="space-y-3" onSubmit={(event) => void submitCourse(event)}>
            <Field label={text.content.courseTitle}>
              <input
                className={inputClass}
                required
                value={courseForm.title}
                onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
              />
            </Field>
            <Field label={text.content.startDate}>
              <input
                className={inputClass}
                type="date"
                value={courseForm.startDate}
                onChange={(event) => setCourseForm({ ...courseForm, startDate: event.target.value })}
              />
            </Field>
            <Button type="submit" variant="primary" disabled={!courseForm.title.trim()}>
              {text.content.addCourse}
            </Button>
          </form>

          <div className="space-y-2 border-t border-border pt-4">
            {courses.length === 0 ? <p className="text-sm text-muted-foreground">{text.content.emptyCourses}</p> : null}
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                className={`block w-full rounded-card px-3 py-2 text-left text-sm ${course.id === selectedCourseId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                onClick={() => setSelectedCourseId(course.id)}
              >
                <span className="block font-medium">{course.title}</span>
                <span className="block text-xs opacity-80">{course.start_date ?? text.content.noStartDate}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          {selectedCourse ? (
            <CourseEditor
              course={selectedCourse}
              form={courseEditForm}
              onFormChange={setCourseEditForm}
              onSubmit={submitCourseEdit}
              onDelete={() =>
                void runMutation(async () => {
                  if (!window.confirm(text.content.confirmDeleteCourse(selectedCourse.title))) {
                    return;
                  }
                  await deleteCourse(selectedCourse.id);
                  setSelectedCourseId(null);
                  await courseMutation.mutateAsync();
                })
              }
            />
          ) : null}

          {selectedCourseId ? (
            <section className="space-y-4 rounded-card border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-foreground">{text.content.sectionsHeading}</h2>
                </div>
              </div>

              <form className="grid gap-3 lg:grid-cols-[1fr_160px_110px_190px_auto]" onSubmit={submitSection}>
                <Field label={text.content.fieldTitle}>
                  <input
                    className={inputClass}
                    required
                    value={sectionForm.title}
                    onChange={(event) => setSectionForm({ ...sectionForm, title: event.target.value })}
                  />
                </Field>
                <Field label={text.content.fieldType}>
                  <select
                    className={inputClass}
                    value={sectionForm.type}
                    onChange={(event) =>
                      setSectionForm({ ...sectionForm, type: event.target.value as SectionType })
                    }
                  >
                    {sectionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={text.content.fieldOrder}>
                  <input
                    className={inputClass}
                    type="number"
                    value={sectionForm.order}
                    onChange={(event) => setSectionForm({ ...sectionForm, order: event.target.value })}
                  />
                </Field>
                <Field label={text.content.moduleGoLive}>
                  <input
                    className={inputClass}
                    type="datetime-local"
                    disabled={sectionForm.type !== "module"}
                    value={sectionForm.goLiveDate}
                    onChange={(event) =>
                      setSectionForm({ ...sectionForm, goLiveDate: event.target.value })
                    }
                  />
                </Field>
                <div className="self-end">
                  <Button type="submit" variant="primary" disabled={!sectionForm.title.trim()}>
                    {text.content.addSection}
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                {sections.map((section, index) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    form={sectionEdits[section.id] ?? emptySectionForm}
                    lessons={lessonsForSection(lessons, section.id)}
                    resources={resources}
                    lessonForms={lessonForms}
                    lessonEdits={lessonEdits}
                    resourceForms={resourceForms}
                    resourceEdits={resourceEdits}
                    uploadingKey={uploadingKey}
                    canMoveUp={index > 0}
                    canMoveDown={index < sections.length - 1}
                    onFormChange={(form) =>
                      setSectionEdits((edits) => ({ ...edits, [section.id]: form }))
                    }
                    onLessonFormChange={(lessonForm) =>
                      setLessonForms((forms) => ({ ...forms, [section.id]: lessonForm }))
                    }
                    onLessonEditChange={(lessonId, form) =>
                      setLessonEdits((edits) => ({ ...edits, [lessonId]: form }))
                    }
                    onResourceFormChange={(lessonId, form) =>
                      setResourceForms((forms) => ({ ...forms, [lessonId]: form }))
                    }
                    onResourceEditChange={(resourceId, form) =>
                      setResourceEdits((edits) => ({ ...edits, [resourceId]: form }))
                    }
                    onSubmit={() =>
                      void runMutation(async () => {
                        const form = sectionEdits[section.id] ?? emptySectionForm;
                        await updateSection(section.id, {
                          title: form.title.trim(),
                          type: form.type,
                          order: orderValue(form.order),
                          go_live_date:
                            form.type === "module" ? isoDateTimeOrNull(form.goLiveDate) : null,
                        });
                        await courseMutation.mutateAsync();
                      })
                    }
                    onDelete={() =>
                      void runMutation(async () => {
                        if (!window.confirm(text.content.confirmDeleteSection(section.title))) {
                          return;
                        }
                        await deleteSection(section.id);
                        await courseMutation.mutateAsync();
                      })
                    }
                    onMove={(direction) =>
                      void runMutation(async () => {
                        await updateSectionOrders(reordered(sections, index, direction));
                        await courseMutation.mutateAsync();
                      })
                    }
                    onLessonSubmit={(event) => void submitLesson(section.id, event)}
                    onLessonSave={(lesson) =>
                      void runMutation(async () => {
                        const form = lessonEdits[lesson.id] ?? emptyLessonForm;
                        const videoUrl = await maybeUpload(
                          form.videoFile,
                          form.videoUrl,
                          `lesson-${lesson.id}`,
                          "videos",
                        );
                        await updateLesson(lesson.id, {
                          title: form.title.trim(),
                          order: orderValue(form.order),
                          video_url: videoUrl || null,
                        });
                        await courseMutation.mutateAsync();
                      })
                    }
                    onLessonDelete={(lesson) =>
                      void runMutation(async () => {
                        if (!window.confirm(text.content.confirmDeleteLesson(lesson.title))) {
                          return;
                        }
                        await deleteLesson(lesson.id);
                        await courseMutation.mutateAsync();
                      })
                    }
                    onLessonMove={(lessonIndex, direction) =>
                      void runMutation(async () => {
                        await updateLessonOrders(
                          reordered(lessonsForSection(lessons, section.id), lessonIndex, direction),
                        );
                        await courseMutation.mutateAsync();
                      })
                    }
                    onResourceSubmit={submitResource}
                    onResourceSave={(resource) =>
                      void runMutation(async () => {
                        const form = resourceEdits[resource.id] ?? emptyResourceForm;
                        const url = await maybeUpload(
                          form.file,
                          form.url,
                          `resource-${resource.id}`,
                          "resources",
                        );
                        await updateLessonResource(resource.id, {
                          title: form.title.trim(),
                          type: form.type,
                          url,
                        });
                        await courseMutation.mutateAsync();
                      })
                    }
                    onResourceDelete={(resource) =>
                      void runMutation(async () => {
                        if (!window.confirm(text.content.confirmDeleteResource(resource.title))) return;
                        await deleteLessonResource(resource.id);
                        await courseMutation.mutateAsync();
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function CourseEditor({
  course,
  form,
  onFormChange,
  onSubmit,
  onDelete,
}: {
  course: Course;
  form: CourseForm;
  onFormChange: (form: CourseForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">{text.content.selectedCourseHeading}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
        </div>
        <Button type="button" variant="danger" onClick={onDelete}>
          {text.content.deleteCourse}
        </Button>
      </div>
      <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_auto]" onSubmit={onSubmit}>
        <Field label={text.content.courseTitle}>
          <input
            className={inputClass}
            required
            value={form.title}
            onChange={(event) => onFormChange({ ...form, title: event.target.value })}
          />
        </Field>
        <Field label={text.content.startDate}>
          <input
            className={inputClass}
            type="date"
            value={form.startDate}
            onChange={(event) => onFormChange({ ...form, startDate: event.target.value })}
          />
        </Field>
        <div className="self-end">
          <Button type="submit" variant="primary" disabled={!form.title.trim()}>
            {text.content.saveCourse}
          </Button>
        </div>
      </form>
    </section>
  );
}

function SectionEditor(props: {
  section: CourseSection;
  form: SectionForm;
  lessons: Lesson[];
  resources: LessonResource[];
  lessonForms: Record<string, LessonForm>;
  lessonEdits: Record<string, LessonForm>;
  resourceForms: Record<string, ResourceForm>;
  resourceEdits: Record<string, ResourceForm>;
  uploadingKey: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onFormChange: (form: SectionForm) => void;
  onLessonFormChange: (form: LessonForm) => void;
  onLessonEditChange: (lessonId: string, form: LessonForm) => void;
  onResourceFormChange: (lessonId: string, form: ResourceForm) => void;
  onResourceEditChange: (resourceId: string, form: ResourceForm) => void;
  onSubmit: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onLessonSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLessonSave: (lesson: Lesson) => void;
  onLessonDelete: (lesson: Lesson) => void;
  onLessonMove: (lessonIndex: number, direction: "up" | "down") => void;
  onResourceSubmit: (lessonId: string, event: FormEvent<HTMLFormElement>) => void;
  onResourceSave: (resource: LessonResource) => void;
  onResourceDelete: (resource: LessonResource) => void;
}) {
  const lessonForm = props.lessonForms[props.section.id] ?? emptyLessonForm;

  return (
    <article className="rounded-card border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">{props.section.title}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {text.content.sectionCaption(props.section.type, props.section.order)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => props.onMove("up")} disabled={!props.canMoveUp}>
            {text.content.moveUp}
          </Button>
          <Button type="button" onClick={() => props.onMove("down")} disabled={!props.canMoveDown}>
            {text.content.moveDown}
          </Button>
          <Button type="button" variant="danger" onClick={props.onDelete}>
            {text.common.delete}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_150px_100px_190px_auto]">
        <Field label={text.content.fieldTitle}>
          <input
            className={inputClass}
            required
            value={props.form.title}
            onChange={(event) => props.onFormChange({ ...props.form, title: event.target.value })}
          />
        </Field>
        <Field label={text.content.fieldType}>
          <select
            className={inputClass}
            value={props.form.type}
            onChange={(event) =>
              props.onFormChange({ ...props.form, type: event.target.value as SectionType })
            }
          >
            {sectionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label={text.content.fieldOrder}>
          <input
            className={inputClass}
            type="number"
            value={props.form.order}
            onChange={(event) => props.onFormChange({ ...props.form, order: event.target.value })}
          />
        </Field>
        <Field label={text.content.moduleGoLive}>
          <input
            className={inputClass}
            type="datetime-local"
            disabled={props.form.type !== "module"}
            value={props.form.goLiveDate}
            onChange={(event) => props.onFormChange({ ...props.form, goLiveDate: event.target.value })}
          />
        </Field>
        <div className="self-end">
          <Button type="button" variant="primary" onClick={props.onSubmit} disabled={!props.form.title.trim()}>
            {text.content.saveSection}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-border pt-4">
        <h4 className="font-medium text-foreground">{text.content.lessonsHeading}</h4>
        <form className="grid gap-3 lg:grid-cols-[1fr_90px_1fr_1fr_auto]" onSubmit={props.onLessonSubmit}>
          <Field label={text.content.fieldTitle}>
            <input
              className={inputClass}
              required
              value={lessonForm.title}
              onChange={(event) => props.onLessonFormChange({ ...lessonForm, title: event.target.value })}
            />
          </Field>
          <Field label={text.content.fieldOrder}>
            <input
              className={inputClass}
              type="number"
              value={lessonForm.order}
              onChange={(event) => props.onLessonFormChange({ ...lessonForm, order: event.target.value })}
            />
          </Field>
          <Field label={text.content.videoUrl}>
            <input
              className={inputClass}
              value={lessonForm.videoUrl}
              onChange={(event) =>
                props.onLessonFormChange({ ...lessonForm, videoUrl: event.target.value })
              }
            />
          </Field>
          <Field label={text.content.uploadVideo}>
            <input
              className={inputClass}
              type="file"
              accept="video/*"
              onChange={(event) =>
                props.onLessonFormChange({ ...lessonForm, videoFile: event.target.files?.[0] ?? null })
              }
            />
          </Field>
          <div className="self-end">
            <Button type="submit" variant="primary" disabled={!lessonForm.title.trim()}>
              {props.uploadingKey === `new-lesson-${props.section.id}` ? text.common.uploading : text.content.addLesson}
            </Button>
          </div>
        </form>

        {props.lessons.map((lesson, index) => (
          <LessonEditor key={lesson.id} lesson={lesson} lessonIndex={index} {...props} />
        ))}
      </div>
    </article>
  );
}

function LessonEditor(
  props: Parameters<typeof SectionEditor>[0] & { lesson: Lesson; lessonIndex: number },
) {
  const form = props.lessonEdits[props.lesson.id] ?? emptyLessonForm;
  const lessonResources = props.resources.filter((resource) => resource.lesson_id === props.lesson.id);
  const resourceForm = props.resourceForms[props.lesson.id] ?? emptyResourceForm;

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h5 className="font-medium text-foreground">{props.lesson.title}</h5>
          <p className="mt-1 text-xs text-muted-foreground">{text.content.fieldOrder} {props.lesson.order}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => props.onLessonMove(props.lessonIndex, "up")}
            disabled={props.lessonIndex === 0}
          >
            {text.content.moveUp}
          </Button>
          <Button
            type="button"
            onClick={() => props.onLessonMove(props.lessonIndex, "down")}
            disabled={props.lessonIndex === props.lessons.length - 1}
          >
            {text.content.moveDown}
          </Button>
          <Button type="button" variant="danger" onClick={() => props.onLessonDelete(props.lesson)}>
            {text.common.delete}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_90px_1fr_1fr_auto]">
        <Field label={text.content.fieldTitle}>
          <input
            className={inputClass}
            required
            value={form.title}
            onChange={(event) =>
              props.onLessonEditChange(props.lesson.id, { ...form, title: event.target.value })
            }
          />
        </Field>
        <Field label={text.content.fieldOrder}>
          <input
            className={inputClass}
            type="number"
            value={form.order}
            onChange={(event) =>
              props.onLessonEditChange(props.lesson.id, { ...form, order: event.target.value })
            }
          />
        </Field>
        <Field label={text.content.videoUrl}>
          <input
            className={inputClass}
            value={form.videoUrl}
            onChange={(event) =>
              props.onLessonEditChange(props.lesson.id, { ...form, videoUrl: event.target.value })
            }
          />
        </Field>
        <Field label={text.content.replaceVideo}>
          <input
            className={inputClass}
            type="file"
            accept="video/*"
            onChange={(event) =>
              props.onLessonEditChange(props.lesson.id, {
                ...form,
                videoFile: event.target.files?.[0] ?? null,
              })
            }
          />
        </Field>
        <div className="self-end">
          <Button type="button" variant="primary" onClick={() => props.onLessonSave(props.lesson)}>
            {props.uploadingKey === `lesson-${props.lesson.id}` ? text.common.uploading : text.content.saveLesson}
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h6 className="text-sm font-medium text-foreground">{text.content.resourcesHeading}</h6>
        <form
          className="grid gap-3 lg:grid-cols-[1fr_120px_1fr_1fr_auto]"
          onSubmit={(event) => props.onResourceSubmit(props.lesson.id, event)}
        >
          <Field label={text.content.fieldTitle}>
            <input
              className={inputClass}
              required
              value={resourceForm.title}
              onChange={(event) =>
                props.onResourceFormChange(props.lesson.id, {
                  ...resourceForm,
                  title: event.target.value,
                })
              }
            />
          </Field>
          <Field label={text.content.fieldType}>
            <select
              className={inputClass}
              value={resourceForm.type}
              onChange={(event) =>
                props.onResourceFormChange(props.lesson.id, {
                  ...resourceForm,
                  type: event.target.value as ResourceType,
                })
              }
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label={text.content.fieldUrl}>
            <input
              className={inputClass}
              value={resourceForm.url}
              onChange={(event) =>
                props.onResourceFormChange(props.lesson.id, { ...resourceForm, url: event.target.value })
              }
            />
          </Field>
          <Field label={text.content.uploadFile}>
            <input
              className={inputClass}
              type="file"
              accept={resourceForm.type === "pdf" ? "application/pdf" : "audio/*"}
              onChange={(event) =>
                props.onResourceFormChange(props.lesson.id, {
                  ...resourceForm,
                  file: event.target.files?.[0] ?? null,
                })
              }
            />
          </Field>
          <div className="self-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!resourceForm.title.trim() || (!resourceForm.url.trim() && !resourceForm.file)}
            >
              {props.uploadingKey === `new-resource-${props.lesson.id}` ? text.common.uploading : text.content.addResource}
            </Button>
          </div>
        </form>

        {lessonResources.map((resource) => {
          const resourceEdit = props.resourceEdits[resource.id] ?? emptyResourceForm;
          return (
            <div key={resource.id} className="grid gap-3 rounded-card border border-border p-3 lg:grid-cols-[1fr_120px_1fr_1fr_auto_auto]">
              <Field label={text.content.fieldTitle}>
                <input
                  className={inputClass}
                  value={resourceEdit.title}
                  onChange={(event) =>
                    props.onResourceEditChange(resource.id, {
                      ...resourceEdit,
                      title: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label={text.content.fieldType}>
                <select
                  className={inputClass}
                  value={resourceEdit.type}
                  onChange={(event) =>
                    props.onResourceEditChange(resource.id, {
                      ...resourceEdit,
                      type: event.target.value as ResourceType,
                    })
                  }
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={text.content.fieldUrl}>
                <input
                  className={inputClass}
                  value={resourceEdit.url}
                  onChange={(event) =>
                    props.onResourceEditChange(resource.id, { ...resourceEdit, url: event.target.value })
                  }
                />
              </Field>
              <Field label={text.content.replaceFile}>
                <input
                  className={inputClass}
                  type="file"
                  accept={resourceEdit.type === "pdf" ? "application/pdf" : "audio/*"}
                  onChange={(event) =>
                    props.onResourceEditChange(resource.id, {
                      ...resourceEdit,
                      file: event.target.files?.[0] ?? null,
                    })
                  }
                />
              </Field>
              <div className="self-end">
                <Button type="button" variant="primary" onClick={() => props.onResourceSave(resource)}>
                  {props.uploadingKey === `resource-${resource.id}` ? text.common.uploading : text.common.save}
                </Button>
              </div>
              <div className="self-end">
                <Button type="button" variant="danger" onClick={() => props.onResourceDelete(resource)}>
                  {text.common.delete}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function lessonsForSection(lessons: Lesson[], sectionId: string) {
  return lessons.filter((lesson) => lesson.section_id === sectionId);
}

function reordered<T extends { id: string }>(items: T[], index: number, direction: "up" | "down") {
  const next = [...items];
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= next.length) return items.map((item, order) => ({ ...item, order }));
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next.map((item, order) => ({ ...item, order }));
}
