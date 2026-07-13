import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, Reveal, FilePicker, inputClass } from "@/components/ui";
// Use FieldGroup as an alternative wrapper for FilePicker, we need to import it or make sure FilePicker handles it
import { useSubmit } from "@/hooks/useSubmit";
import { type LessonForm, emptyLessonForm } from "./types";
import { FieldGroup } from "./FieldGroup";

export function CreateLessonForm({
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
