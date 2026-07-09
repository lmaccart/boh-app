import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
type SectionForm = { title: string; type: SectionType; goLiveDate: string };
type LessonForm = { title: string; videoUrl: string; videoFile: File | null };
type ResourceForm = { title: string; type: ResourceType; url: string; file: File | null };

const emptyCourseForm: CourseForm = { title: "", startDate: "" };
const emptySectionForm: SectionForm = { title: "", type: "welcome", goLiveDate: "" };
const emptyLessonForm: LessonForm = { title: "", videoUrl: "", videoFile: null };
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

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function lessonsForSection(lessons: Lesson[], sectionId: string) {
  return lessons.filter((lesson) => lesson.section_id === sectionId);
}

function Button({
  children,
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const classes = {
    primary: "bg-primary text-primary-foreground hover:bg-brand-600",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    danger: "border border-destructive text-destructive hover:bg-destructive/10",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// Like Field, but not a <label>: FilePicker renders buttons and a hidden file
// input, and a wrapping label would forward every click to the file input.
function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-card border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`animate-reveal ${className}`}>{children}</div>;
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function IconPlus() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 10.5V3M4.75 6.25 8 3l3.25 3.25" />
      <path d="M2.75 10.75v1.5a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1v-1.5" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m4.5 4.5 7 7m0-7-7 7" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function DragHandle({ label }: { label: string }) {
  return (
    <span aria-hidden="true" aria-label={label} className="flex flex-col gap-0.5">
      <span className="block h-0.5 w-4 bg-current" />
      <span className="block h-0.5 w-4 bg-current" />
      <span className="block h-0.5 w-4 bg-current" />
    </span>
  );
}

// Collapsed "+ Add ..." row that expands into a create form on demand.
function AddRow({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
      >
        <IconPlus />
        {label}
      </button>
    );
  }

  return (
    <Reveal className="rounded-card border border-border p-4">
      {children(() => setOpen(false))}
    </Reveal>
  );
}

// Single control for "attach a file or paste a URL". Shows an upload button by
// default, a chip once a file or URL is present, and a progress bar mid-upload.
function FilePicker({
  accept,
  file,
  url,
  onFile,
  onUrl,
  uploadLabel,
  progress,
}: {
  accept: string;
  file: File | null;
  url: string;
  onFile: (file: File | null) => void;
  onUrl: (url: string) => void;
  uploadLabel: string;
  progress?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const openPicker = () => inputRef.current?.click();

  let body: ReactNode;
  if (file) {
    body = (
      <div className="rounded-card border border-border bg-background px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {progress !== undefined
                ? `${text.common.uploading} ${Math.round(progress * 100)}%`
                : formatBytes(file.size)}
            </p>
          </div>
          {progress === undefined ? (
            <button
              type="button"
              aria-label={text.content.removeFile}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onFile(null)}
            >
              <IconX />
            </button>
          ) : null}
        </div>
        {progress !== undefined ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    );
  } else if (urlMode) {
    body = (
      <Reveal className="space-y-1.5">
        <input
          className={inputClass}
          placeholder={text.content.urlPlaceholder}
          aria-label={uploadLabel}
          value={url}
          onChange={(event) => onUrl(event.target.value)}
        />
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setUrlMode(false)}
        >
          {text.content.uploadFileInstead}
        </button>
      </Reveal>
    );
  } else if (url) {
    body = (
      <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-background px-3 py-2">
        <p className="min-w-0 truncate text-sm font-normal text-muted-foreground">{url}</p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={openPicker}
          >
            {text.content.replaceAction}
          </button>
          <button
            type="button"
            aria-label={text.content.removeFile}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onUrl("")}
          >
            <IconX />
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 rounded-card border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
        >
          <IconUpload />
          {uploadLabel}
        </button>
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-primary"
          onClick={() => setUrlMode(true)}
        >
          {text.content.pasteUrlInstead}
        </button>
      </div>
    );
  }

  return (
    <div>
      {body}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          setUrlMode(false);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function useSubmit(work: () => Promise<boolean>, onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const handle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    void work()
      .then((ok) => {
        if (ok) onDone?.();
      })
      .finally(() => setBusy(false));
  };
  return { busy, handle };
}

function CreateCourseForm({
  onCreate,
  onClose,
}: {
  onCreate: (form: CourseForm) => Promise<boolean>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(emptyCourseForm);
  const titleDone = form.title.trim().length > 0;
  const { busy, handle } = useSubmit(() => onCreate(form), onClose);

  return (
    <form className="space-y-3" onSubmit={handle}>
      <Field label={text.content.courseTitle}>
        <input
          className={inputClass}
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      {titleDone ? (
        <Reveal>
          <Field label={text.content.startDate}>
            <input
              className={inputClass}
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
          </Field>
        </Reveal>
      ) : null}
      <div className="flex items-center gap-2">
        {titleDone ? (
          <Reveal>
            <Button type="submit" variant="primary" disabled={busy}>
              {text.content.addCourse}
            </Button>
          </Reveal>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {text.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function CreateSectionForm({
  onCreate,
  onClose,
}: {
  onCreate: (form: SectionForm) => Promise<boolean>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(emptySectionForm);
  const titleDone = form.title.trim().length > 0;
  const { busy, handle } = useSubmit(() => onCreate(form), onClose);

  return (
    <form className="space-y-3" onSubmit={handle}>
      <Field label={text.content.fieldTitle}>
        <input
          className={inputClass}
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      {titleDone ? (
        <Reveal className="grid gap-3 lg:grid-cols-[160px_190px]">
          <Field label={text.content.fieldType}>
            <select
              className={inputClass}
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as SectionType })}
            >
              {sectionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          {form.type === "module" ? (
            <Reveal>
              <Field label={text.content.moduleGoLive}>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={form.goLiveDate}
                  onChange={(event) => setForm({ ...form, goLiveDate: event.target.value })}
                />
              </Field>
            </Reveal>
          ) : null}
        </Reveal>
      ) : null}
      <div className="flex items-center gap-2">
        {titleDone ? (
          <Reveal>
            <Button type="submit" variant="primary" disabled={busy}>
              {text.content.addSection}
            </Button>
          </Reveal>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {text.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function CreateLessonForm({
  onCreate,
  onClose,
  progress,
}: {
  onCreate: (form: LessonForm) => Promise<boolean>;
  onClose: () => void;
  progress?: number;
}) {
  const [form, setForm] = useState(emptyLessonForm);
  const titleDone = form.title.trim().length > 0;
  const { busy, handle } = useSubmit(() => onCreate(form), onClose);

  return (
    <form className="space-y-3" onSubmit={handle}>
      <Field label={text.content.fieldTitle}>
        <input
          className={inputClass}
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      {titleDone ? (
        <Reveal>
          <FieldGroup label={text.content.fieldVideo}>
            <FilePicker
              accept="video/*"
              file={form.videoFile}
              url={form.videoUrl}
              onFile={(videoFile) => setForm({ ...form, videoFile })}
              onUrl={(videoUrl) => setForm({ ...form, videoUrl })}
              uploadLabel={text.content.uploadVideo}
              progress={progress}
            />
          </FieldGroup>
        </Reveal>
      ) : null}
      <div className="flex items-center gap-2">
        {titleDone ? (
          <Reveal>
            <Button type="submit" variant="primary" disabled={busy}>
              {progress !== undefined ? text.common.uploading : text.content.addLesson}
            </Button>
          </Reveal>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {text.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function CreateResourceForm({
  onCreate,
  onClose,
  progress,
}: {
  onCreate: (form: ResourceForm) => Promise<boolean>;
  onClose: () => void;
  progress?: number;
}) {
  const [form, setForm] = useState(emptyResourceForm);
  const titleDone = form.title.trim().length > 0;
  const hasSource = Boolean(form.url.trim() || form.file);
  const { busy, handle } = useSubmit(() => onCreate(form), onClose);

  return (
    <form className="space-y-3" onSubmit={handle}>
      <Field label={text.content.fieldTitle}>
        <input
          className={inputClass}
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      {titleDone ? (
        <Reveal className="space-y-3">
          <div className="max-w-[160px]">
            <Field label={text.content.fieldType}>
              <select
                className={inputClass}
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as ResourceType })}
              >
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <FieldGroup label={text.content.fieldFile}>
            <FilePicker
              accept={form.type === "pdf" ? "application/pdf" : "audio/*"}
              file={form.file}
              url={form.url}
              onFile={(file) => setForm({ ...form, file })}
              onUrl={(url) => setForm({ ...form, url })}
              uploadLabel={text.content.uploadFile}
              progress={progress}
            />
          </FieldGroup>
        </Reveal>
      ) : null}
      <div className="flex items-center gap-2">
        {titleDone && hasSource ? (
          <Reveal>
            <Button type="submit" variant="primary" disabled={busy}>
              {progress !== undefined ? text.common.uploading : text.content.addResource}
            </Button>
          </Reveal>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {text.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function CourseCard({
  course,
  onSave,
  onDelete,
}: {
  course: Course;
  onSave: (form: CourseForm) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CourseForm>({
    title: course.title,
    startDate: dateInputValue(course.start_date),
  });
  const { busy, handle } = useSubmit(
    () => onSave(form),
    () => setEditing(false),
  );

  return (
    <section className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{course.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {course.start_date ?? text.content.noStartDate}
          </p>
        </div>
        {!editing ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setForm({ title: course.title, startDate: dateInputValue(course.start_date) });
              setEditing(true);
            }}
          >
            {text.content.editCourse}
          </Button>
        ) : null}
      </div>
      {editing ? (
        <Reveal>
          <form className="mt-4 space-y-3" onSubmit={handle}>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
              <Field label={text.content.courseTitle}>
                <input
                  className={inputClass}
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </Field>
              <Field label={text.content.startDate}>
                <input
                  className={inputClass}
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={busy || !form.title.trim()}>
                {text.content.saveCourse}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {text.common.cancel}
              </Button>
              <Button type="button" variant="danger" className="ml-auto" onClick={onDelete}>
                {text.content.deleteCourse}
              </Button>
            </div>
          </form>
        </Reveal>
      ) : null}
    </section>
  );
}

function SectionEditForm({
  section,
  onSave,
  onDelete,
}: {
  section: CourseSection;
  onSave: (form: SectionForm) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<SectionForm>({
    title: section.title,
    type: section.type,
    goLiveDate: dateTimeInputValue(section.go_live_date),
  });
  const { busy, handle } = useSubmit(() => onSave(form));

  return (
    <form className="space-y-3" onSubmit={handle}>
      <div className="grid gap-3 lg:grid-cols-[1fr_150px_190px]">
        <Field label={text.content.fieldTitle}>
          <input
            className={inputClass}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>
        <Field label={text.content.fieldType}>
          <select
            className={inputClass}
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as SectionType })}
          >
            {sectionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label={text.content.moduleGoLive}>
          <input
            className={inputClass}
            type="datetime-local"
            disabled={form.type !== "module"}
            value={form.goLiveDate}
            onChange={(event) => setForm({ ...form, goLiveDate: event.target.value })}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={busy || !form.title.trim()}>
          {text.content.saveSection}
        </Button>
        <Button type="button" variant="danger" className="ml-auto" onClick={onDelete}>
          {text.common.delete}
        </Button>
      </div>
    </form>
  );
}

function LessonEditForm({
  lesson,
  onSave,
  onDelete,
  progress,
}: {
  lesson: Lesson;
  onSave: (form: LessonForm) => Promise<boolean>;
  onDelete: () => void;
  progress?: number;
}) {
  const [form, setForm] = useState<LessonForm>({
    title: lesson.title,
    videoUrl: lesson.video_url ?? "",
    videoFile: null,
  });
  const { busy, handle } = useSubmit(() => onSave(form));

  return (
    <form className="space-y-3" onSubmit={handle}>
      <Field label={text.content.fieldTitle}>
        <input
          className={inputClass}
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>
      <FieldGroup label={text.content.fieldVideo}>
        <FilePicker
          accept="video/*"
          file={form.videoFile}
          url={form.videoUrl}
          onFile={(videoFile) => setForm({ ...form, videoFile })}
          onUrl={(videoUrl) => setForm({ ...form, videoUrl })}
          uploadLabel={text.content.uploadVideo}
          progress={progress}
        />
      </FieldGroup>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={busy || !form.title.trim()}>
          {progress !== undefined ? text.common.uploading : text.content.saveLesson}
        </Button>
        <Button type="button" variant="danger" className="ml-auto" onClick={onDelete}>
          {text.common.delete}
        </Button>
      </div>
    </form>
  );
}

function ResourceEditForm({
  resource,
  onSave,
  onDelete,
  progress,
}: {
  resource: LessonResource;
  onSave: (form: ResourceForm) => Promise<boolean>;
  onDelete: () => void;
  progress?: number;
}) {
  const [form, setForm] = useState<ResourceForm>({
    title: resource.title,
    type: resource.type,
    url: resource.url,
    file: null,
  });
  const { busy, handle } = useSubmit(() => onSave(form));

  return (
    <form className="space-y-3" onSubmit={handle}>
      <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
        <Field label={text.content.fieldTitle}>
          <input
            className={inputClass}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>
        <Field label={text.content.fieldType}>
          <select
            className={inputClass}
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as ResourceType })}
          >
            {resourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FieldGroup label={text.content.fieldFile}>
        <FilePicker
          accept={form.type === "pdf" ? "application/pdf" : "audio/*"}
          file={form.file}
          url={form.url}
          onFile={(file) => setForm({ ...form, file })}
          onUrl={(url) => setForm({ ...form, url })}
          uploadLabel={text.content.uploadFile}
          progress={progress}
        />
      </FieldGroup>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={busy || !form.title.trim() || (!form.url.trim() && !form.file)}
        >
          {progress !== undefined ? text.common.uploading : text.common.save}
        </Button>
        <Button type="button" variant="danger" className="ml-auto" onClick={onDelete}>
          {text.common.delete}
        </Button>
      </div>
    </form>
  );
}

function SectionRow({
  section,
  lessonCount,
  expanded,
  onToggle,
  children,
}: {
  section: CourseSection;
  lessonCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const goLive = dateInputValue(section.go_live_date);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-card border border-border bg-background"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-label="Drag to reorder section"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <DragHandle label="Drag to reorder section" />
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          onClick={onToggle}
        >
          <span className="truncate text-sm font-medium text-foreground">{section.title}</span>
          <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Badge>{section.type}</Badge>
            {goLive ? (
              <span className="text-xs">
                {text.content.goLivePrefix} {goLive}
              </span>
            ) : null}
            <span className="text-xs">{text.content.lessonCount(lessonCount)}</span>
            <IconChevron open={expanded} />
          </span>
        </button>
      </div>
      {expanded ? (
        <Reveal className="space-y-4 border-t border-border p-4">{children}</Reveal>
      ) : null}
    </article>
  );
}

function LessonRow({
  lesson,
  resourceCount,
  expanded,
  onToggle,
  children,
}: {
  lesson: Lesson;
  resourceCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lesson.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="rounded-card border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-label="Drag to reorder lesson"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <DragHandle label="Drag to reorder lesson" />
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          onClick={onToggle}
        >
          <span className="truncate text-sm font-medium text-foreground">{lesson.title}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span>{lesson.video_url ? text.content.videoAttached : text.content.noVideo}</span>
            <span>{text.content.resourceCount(resourceCount)}</span>
            <IconChevron open={expanded} />
          </span>
        </button>
      </div>
      {expanded ? (
        <Reveal className="space-y-4 border-t border-border p-4">{children}</Reveal>
      ) : null}
    </div>
  );
}

function ResourceRow({
  resource,
  expanded,
  onToggle,
  children,
}: {
  resource: LessonResource;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-background">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={onToggle}
      >
        <span className="truncate text-sm font-medium text-foreground">{resource.title}</span>
        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <Badge>{resource.type}</Badge>
          <IconChevron open={expanded} />
        </span>
      </button>
      {expanded ? <Reveal className="border-t border-border p-4">{children}</Reveal> : null}
    </div>
  );
}

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
                              onDragEnd={(event) => reorderLessons(section.id, event)}
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
