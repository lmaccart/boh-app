import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { text } from "@/constants/text";
import { Badge, Reveal } from "@/components/ui";
import { IconChevron, DragHandle } from "@/components/ui/icons";
import type { CourseSection } from "../contentData";
import { dateInputValue } from "../utils";

export function SectionRow({
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
