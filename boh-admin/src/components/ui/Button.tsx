
export function Button({
  children,
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const classes = {
    primary: "bg-primary text-primary-foreground hover:bg-brand-600",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    danger: "border border-destructive text-destructive hover:bg-destructive/10",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  };

  return (
    <button
      {...props}
      className={`rounded-card px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
