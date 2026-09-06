import type { ReactNode } from "react";

/** Centred, chrome-free frame for sign in and registration. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
