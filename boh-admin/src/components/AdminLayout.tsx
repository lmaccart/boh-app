import { NavLink, Outlet } from "react-router-dom";

import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";

const navItems = [
  { to: "/inbox", label: text.nav.inbox },
  { to: "/content", label: text.nav.content },
  { to: "/whitelist", label: text.nav.whitelist },
  { to: "/announcements", label: text.nav.announcements },
  { to: "/moderation", label: text.nav.moderation },
];

export function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-6">
          <h1 className="text-lg font-semibold text-foreground">{text.appName}</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "block rounded-card px-4 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <button
            type="button"
            className="w-full rounded-card px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => void signOut()}
          >
            {text.nav.signOut}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
