import type { ReactNode } from "react";
import { Badge, Reveal } from "@/components/ui";
import { IconChevron } from "@/components/ui/icons";
import type { LessonResource } from "../contentData";

export function ResourceRow({
  resource,
  expanded,
  onToggle,
  children,
}: {
  resource: LessonResource;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-background">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={onToggle}
      >
        <span className="truncate text-sm font-medium text-foreground">{resource.title}</span>
        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <Badge>{resource.type}</Badge>
          <IconChevron open={expanded} />
        </span>
      </button>
      {expanded ? <Reveal className="border-t border-border p-4">{children}</Reveal> : null}
    </div>
  );
}
