import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import illustration from "@/assets/login_register.png";

/**
 * Split frame for sign in and registration: a branded panel with the
 * illustration on the left, the form on the right.
 *
 * The left panel is a composition rather than a picture stretched into a box.
 * A half-viewport panel is taller than it is wide and the illustration is
 * landscape, so filling the panel with it either crops the drawing or leaves
 * it small and adrift in the middle of empty space. Instead the panel has a
 * top (the brand), a middle (the illustration, sized to the panel's width)
 * and a bottom (what the product is for), and the illustration sits between
 * them at whatever height its width gives it.
 *
 * The panel is hidden below lg rather than stacked above the form. On a
 * phone the illustration would push the email field off the bottom of the
 * screen, and the email field is the one thing someone opening a login page
 * wants.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh lg:items-start">
      <aside
        // Sticky and viewport-high, so on the taller registration form the
        // panel stays put while the form scrolls beside it.
        className="relative hidden w-1/2 shrink-0 flex-col border-r border-border
                   bg-linear-to-b from-brand/6 via-background to-background
                   px-10 py-8 lg:sticky lg:top-0 lg:flex lg:h-dvh xl:px-14"
      >
        <Link href="/" className="inline-flex items-center gap-2.5 self-start" aria-label="Weekly Reports">
          <BrandMark />
          <span className="text-lg font-bold text-brand">Weekly Reports</span>
        </Link>

        <div className="flex min-h-0 flex-1 items-center justify-center py-6">
          {/*
            Intrinsic sizing rather than `fill`: the image is 2880x2240 with a
            transparent background, so it can be given the panel's width and
            let its own aspect ratio decide the height. `fill` with
            object-contain would centre it inside the whole panel instead of
            inside the space between the brand and the caption.
          */}
          <Image
            src={illustration}
            alt=""
            // Decorative: it carries nothing the form does not already say.
            aria-hidden
            // Above the fold on the first screen anyone sees.
            priority
            // Statically imported: the intrinsic size is known at build time,
            // so this cannot shift layout while it loads.
            placeholder="blur"
            // The panel is half the viewport; the image never exceeds 34rem.
            sizes="(min-width: 1024px) min(50vw, 34rem), 1px"
            className="h-auto w-full max-w-136 object-contain"
          />
        </div>

        <div className="max-w-md">
          <p className="text-xl font-semibold text-primary">
            One report a week. The whole team on one page.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            File what you did and what is in your way. Your manager sees the week without
            chasing anyone, and every version you submitted stays on record.
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

/** The favicon tile, inline so the panel does not fetch an image for a 32px mark. */
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#4F46E5" />
      <rect x="8" y="9" width="16" height="4" rx="2" fill="#FFFFFF" />
      <rect x="8" y="16" width="16" height="4" rx="2" fill="#FFFFFF" />
      <rect x="8" y="23" width="9" height="4" rx="2" fill="#10B981" />
    </svg>
  );
}
