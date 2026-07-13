import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, Reveal, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import type { Course } from "../contentData";
import type { CourseForm } from "../forms/types";
import { dateInputValue } from "../utils";

export function CourseCard({
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
