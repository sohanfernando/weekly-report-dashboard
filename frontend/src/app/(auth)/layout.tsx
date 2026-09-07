import Image from "next/image";
import type { ReactNode } from "react";
import loginImage from "@/assets/login-image.jpg";

/**
 * Split frame for sign in and registration: artwork on the left, form on the
 * right.
 *
 * The artwork is hidden below lg rather than stacked above the form. On a
 * phone a 1065x688 landscape image would push the email field off the bottom
 * of the screen, and the email field is the one thing someone opening a login
 * page wants.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      {/*
        object-contain, not object-cover. The illustration is 1065x688 landscape
        and this panel is half a viewport wide by full height, so covering it
        would crop most of the diagram away — and a diagram with its edges cut
        off is worse than no diagram.

        Letterboxing is invisible here because the illustration's own
        background is #F8F9FB, the same value as the background token, so the
        panel and the image edges meet without a seam. The right border is what
        separates the two halves, since both sides share that colour.
      */}
      <div className="relative hidden w-1/2 shrink-0 border-r border-border bg-background p-6 xl:p-10 lg:block">
        <Image
          src={loginImage}
          alt=""
          // Decorative: it carries nothing the form does not already say, so
          // announcing it would only add noise for a screen reader.
          aria-hidden
          fill
          // The panel is half the viewport, which is what lets Next pick a
          // sensible source width instead of assuming full width.
          sizes="50vw"
          // Above the fold on the first screen anyone sees, so it should not
          // wait behind lazy loading.
          priority
          // Statically imported, so the intrinsic size is known at build time
          // and this cannot shift layout while it loads.
          placeholder="blur"
          className="object-contain"
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
