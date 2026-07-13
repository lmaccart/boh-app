import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { text } from "@/constants/text";
import { Reveal } from "@/components/ui";
import { IconChevron, DragHandle } from "@/components/ui/icons";
import type { Lesson } from "../contentData";

export function LessonRow({
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
