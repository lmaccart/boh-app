import { Navigate, Outlet } from "react-router-dom";

import { text } from "@/constants/text";
import { useAuth } from "@/providers/AuthProvider";

export function RequireStaff() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{text.common.loading}</p>
      </main>
    );
  }

  if (status !== "staff") return <Navigate to="/sign-in" replace />;

  return <Outlet />;
}
