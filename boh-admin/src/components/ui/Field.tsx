import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// Like Field, but not a <label>: FilePicker renders buttons and a hidden file
// input, and a wrapping label would forward every click to the file input.
export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
