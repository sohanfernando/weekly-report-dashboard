"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  BarChart3,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelRightOpen,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Loading, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DURATION, EASE, RESTING, RISE, STAGGER, withMotion } from "@/lib/motion";
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
  // Filing a report is a member capability, so a manager has no "mine" to show.
  { href: "/reports", label: "My reports", icon: <ClipboardList className="size-4" />, roles: ["MEMBER"] },
  { href: "/projects", label: "Projects", icon: <FolderKanban className="size-4" /> },
  { href: "/users", label: "User management", icon: <BarChart3 className="size-4" />, roles: ["MANAGER"] },
  { href: "/settings", label: "Settings", icon: <Settings className="size-4" /> },
];

/**
 * Rail geometry in px, kept here so the tweens and the layout cannot drift apart.
 *
 * Centring in the 64px rail depends on what the row sits inside:
 *
 * - Nav links live inside a nav with its own px-3, so their box is 40px wide.
 *   A 16px icon centres at (40 - 16) / 2 = 12 — which px-3 already gives. Their
 *   padding is therefore not animated at all; an earlier version tweened it to
 *   24, which exceeds the 40px box and pushed every icon off to the right.
 * - The header row and footer rows span the full 64px, and hold a 32px control,
 *   so they centre at (64 - 32) / 2 = 16 and do need the tween.
 */
const RAIL = {
  expanded: 256,
  collapsed: 64,
  /** For full-width rows holding a 32px control: header toggle, footer avatar. */
  widePadCollapsed: 16,
  widePadExpanded: 12,
} as const;

/**
 * The signed-in chrome: sidebar, header, and the client-side session guard.
 *
 * Collapsing is animated entirely by GSAP, and nothing about the collapsed look
 * is expressed as a Tailwind class. That is deliberate: a class toggled by
 * React applies on the very next paint, so any property described both ways
 * snaps to its final value and *then* gets animated from there. Two engines
 * driving one property is what made the earlier version stutter.
 *
 * The guard is a convenience, not a security boundary — the API rejects
 * anything the caller may not do regardless of what the UI renders.
 */
export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const { data: user, isPending } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sidebar = useRef<HTMLElement>(null);
  const nav = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);

  /**
   * Collapsing and expanding the rail.
   *
   * Order is the whole trick. Collapsing fades the labels, takes them out of
   * layout, and only then narrows the rail, so the rail never closes onto
   * visible text. Expanding reverses it: the space is made first and the labels
   * arrive into room that already exists.
   */
  useGSAP(
    () => {
      const aside = sidebar.current;
      if (!aside) return;

      const labels = aside.querySelectorAll("[data-rail-label]");
      // Only the full-width rows need their padding animated; see RAIL.
      const wideRows = aside.querySelectorAll("[data-rail-row-wide]");

      // Scoped by media query rather than an innerWidth check: GSAP reverts a
      // context's inline styles when its query stops matching, so collapsing on
      // desktop and resizing to mobile cannot leave the drawer pinned narrow.
      const media = gsap.matchMedia(aside);

      media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: EASE.inOut, duration: DURATION.base } });

        if (collapsed) {
          timeline
            .to(labels, { opacity: 0, duration: DURATION.instant, ease: EASE.in })
            // display:none rather than width:0 — it removes the labels from
            // layout entirely, so the flex gap collapses with them and there is
            // no leftover sliver to account for.
            .set(labels, { display: "none" })
            .to(aside, { width: RAIL.collapsed }, "<")
            .to(
              wideRows,
              { paddingLeft: RAIL.widePadCollapsed, paddingRight: RAIL.widePadCollapsed },
              "<",
            );
        } else {
          timeline
            .set(labels, { display: "" })
            .to(aside, { width: RAIL.expanded }, 0)
            .to(
              wideRows,
              { paddingLeft: RAIL.widePadExpanded, paddingRight: RAIL.widePadExpanded },
              0,
            )
            // Labels fade in over the second half, once there is room for them.
            .to(
              labels,
              { opacity: 1, duration: DURATION.quick, ease: EASE.out, stagger: 0.015 },
              0.14,
            );
        }
      });

      media.add("(min-width: 1024px) and (prefers-reduced-motion: reduce)", () => {
        gsap.set(aside, { width: collapsed ? RAIL.collapsed : RAIL.expanded });
        gsap.set(labels, { opacity: collapsed ? 0 : 1, display: collapsed ? "none" : "" });
        gsap.set(wideRows, {
          paddingLeft: collapsed ? RAIL.widePadCollapsed : RAIL.widePadExpanded,
          paddingRight: collapsed ? RAIL.widePadCollapsed : RAIL.widePadExpanded,
        });
      });
    },
    { dependencies: [collapsed] },
  );

  /** Nav items arrive as one gesture the first time the shell mounts. */
  useGSAP(
    () => {
      const links = nav.current?.querySelectorAll("[data-rail-row]");
      if (!links?.length) return;

      withMotion(
        nav.current,
        () => {
          gsap.set(links, { opacity: 0, x: -8 });
          gsap.to(links, {
            opacity: 1,
            x: 0,
            duration: DURATION.quick,
            ease: EASE.out,
            stagger: STAGGER.each,
          });
        },
        () => gsap.set(links, { opacity: 1, x: 0 }),
      );
    },
    { scope: nav },
  );

  /** Page transition, keyed on the route so each screen announces itself. */
  useGSAP(
    () => {
      const node = main.current;
      if (!node) return;

      withMotion(
        node,
        () => {
          gsap.set(node, { opacity: 0, y: RISE });
          gsap.to(node, { ...RESTING, duration: DURATION.quick, ease: EASE.out });
        },
        () => gsap.set(node, RESTING),
      );
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

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
        ref={sidebar}
        className={cn(
          // Wider than the desktop rail on purpose: the drawer has no collapse
          // control to make room for, and at 256px the longest label ("User
          // management") and the wordmark were both hitting their ellipsis.
          // max-w caps it on genuinely narrow screens so it can never end up
          // wider than the viewport it is sliding into.
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col overflow-x-hidden",
          // Back to the rail width once the collapse tween owns it; without
          // this, desktop would paint at 288px for a frame before GSAP set it.
          "lg:w-64",
          "border-r border-border bg-surface",
          // Pinned to the viewport rather than stretched to the page, so the
          // account footer stays reachable however long the page is.
          "lg:sticky lg:top-0 lg:bottom-auto lg:h-dvh lg:self-start",
          // Only the drawer slide is a CSS transition. Width, padding and label
          // opacity all belong to GSAP.
          "transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          data-rail-row-wide
          className="flex h-14 shrink-0 items-center gap-2 overflow-hidden px-3"
        >
          {/* The drawer has no rail to collapse, so here the mark is only ever
              decoration — the interactive version below is desktop-only. */}
          <BrandMark className="size-7 shrink-0 lg:hidden" />

          {/*
            On desktop the mark doubles as the expand control. Collapsed, the
            rail is 64px and fits exactly one 32px box, so the mark and a
            chevron cannot both be shown — pointing at it swaps one for the
            other instead. Expanded, the chevron on the right does the same
            job, and this stays a second, more discoverable way in.

            The crossfade is Tailwind's rather than GSAP's, which does not
            break the one-engine-per-property rule this file opens with: the
            collapse timeline drives width, row padding and label opacity,
            and never touches the opacity of these two icons.
          */}
          <button
            type="button"
            onClick={() => setCollapsed((open) => !open)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="group relative hidden size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-muted lg:inline-flex"
          >
            <BrandMark className="size-7 transition-opacity duration-200 group-hover:opacity-0" />
            <PanelRightOpen
              aria-hidden
              className={cn(
                "absolute size-4 text-secondary opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                collapsed && "rotate-180",
              )}
            />
          </button>

          {/*
            The wordmark goes to the user's own starting page, not to "/":
            that is the public landing page, and a signed-in user clicking
            their app's name expects to stay in the app.
          */}
          <Link
            href={user.role === "MANAGER" ? "/dashboard" : "/reports"}
            onClick={() => setMobileOpen(false)}
            data-rail-label
            className="min-w-0 flex-1 truncate whitespace-nowrap text-lg font-bold text-brand"
          >
            Weekly Reports
          </Link>

          {/*
            data-rail-label, so the collapse timeline fades this and takes it
            out of layout along with the text: at 64px the rail holds one
            control, and that control is the mark. It is therefore only ever
            seen expanded, which is why it needs no rotated state.
          */}
          <button
            type="button"
            onClick={() => setCollapsed((open) => !open)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
            data-rail-label
            className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-secondary transition hover:bg-surface-muted hover:text-primary lg:inline-flex"
          >
            <PanelRightOpen className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="shrink-0 text-secondary lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav
          ref={nav}
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2"
        >
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Collapsed, the icon is the only affordance, so the label has
                // to survive as tooltip and accessible name.
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                data-rail-row
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-brand font-medium text-brand-foreground hover:bg-brand-hover"
                    : "text-secondary hover:bg-surface-muted hover:text-primary",
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">{item.icon}</span>
                <span data-rail-label className="truncate whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <SidebarFooter user={user} collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky too, so the header does not scroll away from a sidebar that
            stays put — the two are one piece of chrome. */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-8">
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

        <main ref={main} className="flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
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

/**
 * Account block at the bottom of the sidebar.
 *
 * One DOM structure for both states rather than two that swap. Collapsing hides
 * the text and leaves the avatar and the sign-out icon, so the change is a fade
 * rather than a replacement — nothing unmounts, so nothing can pop.
 */
function SidebarFooter({ user, collapsed }: Readonly<{ user: User; collapsed: boolean }>) {
  const logout = useLogout();
  const router = useRouter();

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => router.replace("/login"),
    });

  return (
    <div className="shrink-0 overflow-hidden border-t border-border py-3">
      <Link
        href="/settings"
        title={collapsed ? `${user.name} — account settings` : undefined}
        aria-label={collapsed ? `${user.name} — account settings` : undefined}
        data-rail-row-wide
        className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-surface-muted"
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
        >
          {initialsOf(user.name)}
        </span>
        <span data-rail-label className="min-w-0 whitespace-nowrap">
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
        title={collapsed ? "Sign out" : undefined}
        aria-label={collapsed ? "Sign out" : undefined}
        data-rail-row-wide
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-primary disabled:opacity-50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center">
          <LogOut className="size-4" />
        </span>
        <span data-rail-label className="whitespace-nowrap">
          {logout.isPending ? "Signing out…" : "Sign out"}
        </span>
      </button>
    </div>
  );
}
