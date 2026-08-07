import { Link } from "react-router-dom";

import { text } from "@/constants/text";

export function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-4xl font-semibold text-muted-foreground">{text.notFound.code}</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">{text.notFound.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.notFound.body}</p>
        <Link
          to="/inbox"
          className="mt-6 inline-block rounded-card bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-brand-600"
        >
          {text.notFound.backToInbox}
        </Link>
      </div>
    </main>
  );
}
