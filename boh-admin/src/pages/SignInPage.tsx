import { Navigate } from "react-router-dom";

import { text } from "@/constants/text";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export function SignInPage() {
  const { status } = useAuth();

  if (status === "staff") return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{text.signIn.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text.signIn.subtitle}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-card bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-brand-600"
          onClick={() =>
            void supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin },
            })
          }
        >
          {text.signIn.googleButton}
        </button>
        {status === "not-staff" ? (
          <p className="mt-4 text-sm text-destructive">{text.signIn.adminsOnly}</p>
        ) : null}
      </div>
    </main>
  );
}
