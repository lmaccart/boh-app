import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, Reveal, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import { type CourseForm, emptyCourseForm } from "./types";

export function CreateCourseForm({
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
