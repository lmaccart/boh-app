import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import type { SectionForm } from "./types";
import { type CourseSection, type SectionType, sectionTypes } from "../contentData";
import { dateTimeInputValue } from "../utils";

export function SectionEditForm({
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
