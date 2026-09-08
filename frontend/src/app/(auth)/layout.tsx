import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import illustration from "@/assets/login-register.png";

/**
 * Split frame for sign in and registration: a branded panel on the left, the
 * form on the right.
 *
 * Two things about the artwork drive this layout.
 *
 * It has a flat white background rather than a transparent one, so the panel
 * behind it is white too. Anything else — a tint, a gradient, the page's own
 * off-white — draws a visible rectangle around the image, because a picture
 * cannot blend into a colour it does not contain. White against the off-white
 * form side is the same relationship a Card has with the page everywhere else
 * in the app, so the split still reads.
 *
 * And it is drawn cropped: the desk and chair run off the bottom and left of
 * the canvas. It is composed to bleed off an edge rather than float in the
 * middle of a box, so the copy sits at the top and the illustration fills the
 * bottom of the panel and runs off it.
 *
 * The panel is hidden below lg rather than stacked above the form. On a phone
 * it would push the email field off the bottom of the screen, and the email
 * field is the entire reason someone is on this page.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh lg:items-start">
      <aside
        // Sticky and viewport-high: registration is a six-field form and
        // scrolls, and without this the artwork scrolls away with it and
        // leaves a blank column behind.
        className="relative hidden w-1/2 shrink-0 flex-col overflow-hidden border-r border-border
                   bg-surface pt-8 lg:sticky lg:top-0 lg:flex lg:h-dvh"
      >
        <div className="px-10 xl:px-14">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Weekly Reports">
            <BrandMark />
            <span className="text-lg font-bold text-brand">Weekly Reports</span>
          </Link>

          <div className="mt-10 max-w-md xl:mt-12">
            <p className="text-2xl font-semibold leading-snug text-primary">
              One report a week. The whole team on one page.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              File what you did and what is in your way. Your manager sees the week without
              chasing anyone, and every version you submitted stays on record.
            </p>
          </div>
        </div>

        {/*
          The illustration takes whatever height is left and sits on the bottom
          edge, so the cropped desk continues off the panel instead of stopping
          at one. object-contain leaves room at the sides on a wide panel,
          which is invisible here: the image ground and the panel are the same
          white.
        */}
        <div className="relative mt-8 min-h-0 flex-1">
          <Image
            src={illustration}
            alt=""
            // Decorative: it carries nothing the form does not already say.
            aria-hidden
            // Above the fold on the first screen anyone sees.
            priority
            // Statically imported, so the intrinsic size is known at build
            // time and this cannot shift layout while it loads.
            placeholder="blur"
            fill
            sizes="(min-width: 1024px) 50vw, 1px"
            className="object-contain object-bottom"
          />
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
