export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm font-medium text-foreground">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
