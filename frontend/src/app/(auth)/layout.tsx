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
 *
 * At lg and up the panel floats as a rounded card with a gutter on every
 * side, rather than filling the half-viewport edge to edge — the outer
 * lg:p-4/lg:gap-4 is what makes that gutter, and the sticky offset and height
 * below are sized to match it exactly, so the card's bottom edge lands on the
 * gutter rather than the true viewport edge.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh lg:items-start lg:gap-4 lg:p-4">
      <aside
        // Sticky and viewport-high (minus the gutter): registration is a
        // six-field form and scrolls, and without this the artwork scrolls
        // away with it and leaves a blank column behind.
        className="relative hidden w-1/2 shrink-0 flex-col overflow-hidden rounded-2xl
                   border border-border bg-surface pt-8
                   lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)]"
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
          Sized to the panel's full width, with its own aspect ratio choosing
          the height — not `fill` with object-contain, which fits the image
          inside the box and leaves a margin down both sides whenever the box
          is proportionally taller than the picture.

          mt-auto pushes it to the bottom when there is room to spare, and
          collapses to nothing when there is not, so on a short viewport the
          image overflows the bottom of the panel and is clipped there by the
          aside's own rounded corner. The desk is already drawn running off
          that edge, so the crop reads as part of the picture.
        */}
        <div className="mt-auto pt-8">
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
            sizes="(min-width: 1024px) 50vw, 1px"
            className="h-auto w-full"
          />
        </div>
      </aside>

      <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0">
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
