import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, Reveal, FilePicker, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import { type ResourceForm, emptyResourceForm } from "./types";
import { type ResourceType, resourceTypes } from "../contentData";
import { FieldGroup } from "./FieldGroup";

export function CreateResourceForm({
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
