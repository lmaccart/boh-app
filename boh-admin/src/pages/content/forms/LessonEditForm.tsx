import { useState } from "react";
import { text } from "@/constants/text";
import { Button, Field, FilePicker, inputClass } from "@/components/ui";
import { useSubmit } from "@/hooks/useSubmit";
import type { LessonForm } from "./types";
import type { Lesson } from "../contentData";
import { FieldGroup } from "./FieldGroup";

export function LessonEditForm({
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
