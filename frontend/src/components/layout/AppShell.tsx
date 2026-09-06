"use client";

import {
  BarChart3,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Loading, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useLogout, useMe } from "@/lib/queries";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Omit to show for everyone. */
  roles?: Role[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" />, roles: ["MANAGER"] },
  { href: "/review", label: "Review queue", icon: <ShieldCheck className="size-4" />, roles: ["MANAGER"] },
  { href: "/team", label: "Team", icon: <Users className="size-4" />, roles: ["MANAGER"] },
  { href: "/reports", label: "My reports", icon: <ClipboardList className="size-4" /> },
  { href: "/projects", label: "Projects", icon: <FolderKanban className="size-4" /> },
  { href: "/users", label: "User management", icon: <BarChart3 className="size-4" />, roles: ["MANAGER"] },
  { href: "/settings", label: "Settings", icon: <Settings className="size-4" /> },
];

/**
 * The signed-in chrome: sidebar, header, and the client-side session guard.
 *
 * The guard is a convenience, not a security boundary — the API rejects
 * anything the caller may not do regardless of what the UI renders.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login");
    }
  }, [isPending, user, router]);

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!user) {
    return <Loading label="Redirecting to sign in" />;
  }

  const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-dvh">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/" className="text-sm font-semibold text-primary">
            Weekly Reports
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-secondary lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand font-medium text-brand-foreground hover:bg-brand-hover"
                    : "text-secondary hover:bg-surface-muted hover:text-primary",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <UserCard />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-secondary lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">{user.name}</p>
            <p className="truncate text-xs text-secondary">
              {user.jobTitle ?? (user.role === "MANAGER" ? "Manager" : "Team member")}
            </p>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function UserCard() {
  const { data: user } = useMe();
  const logout = useLogout();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 px-2">
        <p className="truncate text-xs font-medium text-primary">{user.email}</p>
        <p className="text-xs text-secondary">{user.role === "MANAGER" ? "Manager" : "Team member"}</p>
      </div>
      <button
        type="button"
        onClick={() =>
          logout.mutate(undefined, {
            onSettled: () => router.replace("/login"),
          })
        }
        disabled={logout.isPending}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-secondary transition hover:bg-surface-muted hover:text-primary disabled:opacity-50"
      >
        <LogOut className="size-4" />
        {logout.isPending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
