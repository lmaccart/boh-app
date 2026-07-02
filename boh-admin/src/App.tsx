import { text } from "@/constants/text";

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground">{text.appName}</h1>
    </main>
  );
}
