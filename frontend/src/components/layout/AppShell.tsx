"use client";

import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
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
import type { Role, User } from "@/lib/types";

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
 * The sidebar has two independent states. On small screens it is a drawer that
 * slides over the page. From large screens up it is always in the layout, and
 * can be collapsed to an icon-only rail — the collapse toggle is hidden on
 * mobile, where a 4rem rail would be worse than the drawer it replaced.
 *
 * The guard is a convenience, not a security boundary — the API rejects
 * anything the caller may not do regardless of what the UI renders.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login");
    }
  }, [isPending, user, router]);

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
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface",
          "transition-all duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // The rail width only applies from lg up: the mobile drawer stays
          // full width whatever the desktop collapse state is.
          collapsed && "lg:w-16",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center gap-2 px-3",
            collapsed ? "lg:justify-center lg:px-0" : "justify-between px-5",
          )}
        >
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "truncate text-sm font-semibold text-primary",
              collapsed && "lg:hidden",
            )}
          >
            Weekly Reports
          </Link>

          {/* Desktop collapse toggle. */}
          <button
            type="button"
            onClick={() => setCollapsed((open) => !open)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-secondary transition hover:bg-surface-muted hover:text-primary lg:inline-flex"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>

          {/* Mobile close button. */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-secondary lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className={cn("flex-1 space-y-0.5 py-2", collapsed ? "lg:px-2" : "px-3")}>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Collapsed, the icon is the only affordance, so the label has
                // to survive as a tooltip and as the accessible name.
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  collapsed && "lg:justify-center lg:px-0",
                  active
                    ? "bg-brand font-medium text-brand-foreground hover:bg-brand-hover"
                    : "text-secondary hover:bg-surface-muted hover:text-primary",
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <SidebarFooter user={user} collapsed={collapsed} />
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

/** Initials for the avatar: first and last word, so "Ravi Silva" reads RS. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * Account block at the bottom of the sidebar.
 *
 * Expanded it names the account and labels the sign-out action. Collapsed it
 * falls back to two icon targets — the avatar links to account settings, and
 * the second signs out — because at 4rem there is no room for either label.
 */
function SidebarFooter({ user, collapsed }: { user: User; collapsed: boolean }) {
  const logout = useLogout();
  const router = useRouter();

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => router.replace("/login"),
    });

  return (
    <div className={cn("border-t border-border p-3", collapsed && "lg:px-2")}>
      {/* Collapsed: icon-only profile and sign out, stacked. */}
      <div className={cn("hidden flex-col items-center gap-1", collapsed && "lg:flex")}>
        <Link
          href="/settings"
          title={`${user.name} — account settings`}
          aria-label={`${user.name} — account settings`}
          className="flex size-9 items-center justify-center rounded-lg transition hover:bg-surface-muted"
        >
          <Avatar name={user.name} />
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={logout.isPending}
          title="Sign out"
          aria-label="Sign out"
          className="flex size-9 items-center justify-center rounded-lg text-secondary transition hover:bg-surface-muted hover:text-primary disabled:opacity-50"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      {/* Expanded: the same two actions, named. */}
      <div className={cn(collapsed && "lg:hidden")}>
        <Link
          href="/settings"
          className="mb-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-surface-muted"
        >
          <Avatar name={user.name} />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-primary">{user.email}</span>
            <span className="block text-xs text-secondary">
              {user.role === "MANAGER" ? "Manager" : "Team member"}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={logout.isPending}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-secondary transition hover:bg-surface-muted hover:text-primary disabled:opacity-50"
        >
          <LogOut className="size-4" />
          {logout.isPending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
