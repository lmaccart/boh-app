import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, Reveal, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import { type SectionForm, emptySectionForm } from "./types";
import { type SectionType, sectionTypes } from "../contentData";

export function CreateSectionForm({
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
