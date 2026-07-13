import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}
