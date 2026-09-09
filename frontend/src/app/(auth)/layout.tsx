import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

/**
 * Split frame for sign in and registration: a branded panel on the left, the
 * form on the right.
 *
 * The panel carries no photography and no illustrative graphic — colour is
 * the only decoration, from two soft blurred fields in brand and
 * approved-green (see the glow layer below), and the brand lockup itself is
 * sized up to be the panel's visual anchor rather than a small corner detail
 * competing with that colour for attention.
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
          {/*
            The lockup is the panel's one visual anchor, so it is sized well
            past its usual small-corner scale: size-11 next to text-2xl,
            rather than the size-8/text-lg pairing used everywhere else the
            mark appears (the app sidebar, and the mobile-only row on the auth
            pages themselves, where the panel is hidden).
          */}
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Weekly Reports">
            <BrandMark className="size-11 shrink-0" />
            <span className="text-2xl font-bold">Weekly Reports</span>
          </Link>

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

      {/*
        lg:min-h-[calc(100dvh-2rem)] matches the aside's own lg:h-[...] exactly
        — same gutter math, same result. min-h-0 here (or leaving the base
        min-h-dvh unmatched to the gutter) would give this column no real
        height to centre within at lg, and items-center/justify-center would
        have nothing to act on: the form would sit flush at the top instead
        of centred in the column.
      */}
      <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:min-h-[calc(100dvh-2rem)]">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
