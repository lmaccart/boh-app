import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, FilePicker, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import type { ResourceForm } from "./types";
import { type LessonResource, type ResourceType, resourceTypes } from "../contentData";
import { FieldGroup } from "./FieldGroup";

export function ResourceEditForm({
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
