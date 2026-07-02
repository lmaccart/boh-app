import { text } from "@/constants/text";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text.placeholder.comingSoon}</p>
    </div>
  );
}
