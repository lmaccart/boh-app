export function IconPlus() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function IconUpload() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 10.5V3M4.75 6.25 8 3l3.25 3.25" />
      <path d="M2.75 10.75v1.5a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1v-1.5" />
    </svg>
  );
}

export function IconX() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m4.5 4.5 7 7m0-7-7 7" />
    </svg>
  );
}

export function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function DragHandle({ label }: { label: string }) {
  return (
    <span aria-hidden="true" aria-label={label} className="flex flex-col gap-0.5">
      <span className="block h-0.5 w-4 bg-current" />
      <span className="block h-0.5 w-4 bg-current" />
      <span className="block h-0.5 w-4 bg-current" />
    </span>
  );
}
