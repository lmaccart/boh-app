import { useState, type ReactNode } from "react";
import { IconPlus } from "./icons";
import { Reveal } from "./Reveal";

// Collapsed "+ Add ..." row that expands into a create form on demand.
export function AddRow({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
      >
        <IconPlus />
        {label}
      </button>
    );
  }

  return (
    <Reveal className="rounded-card border border-border p-4">
      {children(() => setOpen(false))}
    </Reveal>
  );
}
