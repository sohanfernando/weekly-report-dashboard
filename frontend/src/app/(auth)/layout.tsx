import Image from "next/image";
import type { ReactNode } from "react";
import loginImage from "@/assets/login-image.jpg";

/**
 * Split frame for sign in and registration: artwork on the left, form on the
 * right.
 *
 * The artwork is hidden below lg rather than stacked above the form. On a
 * phone a 1065x688 landscape image would push the email field off the bottom
 * of the screen, and the one thing someone opening a login page wants is the
 * email field.
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden w-1/2 shrink-0 lg:block">
        <Image
          src={loginImage}
          alt=""
          // Decorative, so no alt text and hidden from assistive tech: it
          // carries no information the form does not already give.
          aria-hidden
          fill
          // The panel is half the viewport, which is what lets Next pick a
          // sensible source width instead of assuming full width.
          sizes="50vw"
          // Above the fold on the first screen anyone sees, so it should not
          // wait behind lazy-loading.
          priority
          // Statically imported, so the intrinsic size is known at build time
          // and this cannot shift layout while it loads.
          placeholder="blur"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
