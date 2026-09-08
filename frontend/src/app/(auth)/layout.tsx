import { CheckCircle2, Clock3, FileEdit } from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";

/**
 * Split frame for sign in and registration: a branded panel on the left, the
 * form on the right.
 *
 * The panel carries no photography. Its one graphic element is the product's
 * own status vocabulary — draft, submitted, approved — staged as a small
 * offset card stack, in the same shape as the app's own StatusBadge. A
 * marketing panel that foreshadows the actual UI earns its place better than
 * a generic illustration would; it is also literally what this product does,
 * which a stock drawing of "someone at a desk" is not.
 *
 * The panel is one deliberately dark surface, independent of the light
 * palette declared in globals.css and not conditioned on
 * prefers-color-scheme — see the `--color-ink` token there. It is a single
 * panel styled dark on purpose, not a second theme switching in behind it.
 *
 * Hidden below lg, same reasoning as before: on a phone this panel would push
 * the email field off the bottom of the screen, and the email field is the
 * entire reason someone is on this page. At lg and up it floats as a rounded
 * card with a gutter, matching the treatment already used across the app.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh lg:items-start lg:gap-4 lg:p-4">
      <aside
        className="relative hidden w-1/2 shrink-0 flex-col overflow-hidden rounded-2xl bg-ink
                   text-white lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)]"
      >
        {/*
          Ambient colour, not a picture: two soft blurred fields in brand and
          approved-green. Direct children of `aside` rather than of the padded
          content wrapper below, so `inset-0` measures the panel's full box
          and the glow can bleed all the way to the rounded corners.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 size-80 rounded-full bg-brand/50 blur-3xl" />
          <div className="absolute -bottom-24 -right-12 size-80 rounded-full bg-status-approved/25 blur-3xl" />
        </div>

        {/*
          `relative` here — not left `static` — is load-bearing, not
          decorative: a positioned element paints above a non-positioned one
          in the same stacking context regardless of source order, so without
          this the glow behind would sit on top of the content instead of
          behind it.
        */}
        <div className="relative flex h-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Weekly Reports">
            <BrandMark />
            <span className="text-lg font-bold">Weekly Reports</span>
          </Link>

          <div className="flex flex-1 items-center">
            <div className="relative h-56 w-full max-w-xs">
              <StatusChip
                icon={FileEdit}
                label="Draft saved"
                className="left-0 top-0 -rotate-3 border-white/15 bg-white/10 text-white/70"
              />
              <StatusChip
                icon={Clock3}
                label="Submitted for review"
                className="left-6 top-20 rotate-2 border-status-submitted/30 bg-status-submitted/15
                           text-status-submitted"
              />
              <StatusChip
                icon={CheckCircle2}
                label="Approved"
                className="left-2 top-40 -rotate-1 border-status-approved/30 bg-status-approved/15
                           text-status-approved"
              />
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-4xl font-extrabold leading-[1.05] tracking-tight xl:text-5xl">
              Stop chasing
              <br />
              <span className="text-status-approved">status updates.</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              File your week once. Your manager sees exactly where things stand — no
              follow-up messages required.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

/** One card in the status stack. Absolutely positioned; `className` places and rotates it. */
function StatusChip({
  icon: Icon,
  label,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3",
        "text-sm font-medium shadow-lg shadow-black/20 backdrop-blur-sm",
        className,
      )}
    >
      <Icon className="size-4" />
      {label}
    </div>
  );
}
