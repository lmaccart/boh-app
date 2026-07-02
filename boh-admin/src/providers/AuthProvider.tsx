import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type AuthStatus = "loading" | "signed-out" | "not-staff" | "staff";
export type StaffRole = "admin" | "tarryn";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  role: StaffRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Monotonic counter so a slow role query cannot clobber the state set by
    // a newer resolveSession call (e.g. getSession and INITIAL_SESSION both
    // firing on mount, or a sign-out racing an in-flight role lookup).
    let generation = 0;

    async function resolveSession(next: Session | null) {
      const gen = ++generation;

      if (!next) {
        if (cancelled) return;
        setSession(null);
        setRole(null);
        // A non-staff sign-in triggers signOut below, which fires a null
        // session event; keep showing "admins only" rather than resetting.
        setStatus((prev) => (prev === "not-staff" ? "not-staff" : "signed-out"));
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", next.user.id)
        .single();
      if (cancelled || gen !== generation) return;

      if (error || !data || (data.role !== "admin" && data.role !== "tarryn")) {
        // Set status before signOut so the resulting null-session event sees
        // prev === "not-staff" and preserves it.
        setSession(null);
        setRole(null);
        setStatus("not-staff");
        await supabase.auth.signOut();
        return;
      }

      setSession(next);
      setRole(data.role);
      setStatus("staff");
    }

    void supabase.auth.getSession().then(({ data }) => resolveSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase warns against awaiting other client calls inside this
      // callback; defer to the next tick.
      setTimeout(() => void resolveSession(next), 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, role, signOut }),
    [status, session, role, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
