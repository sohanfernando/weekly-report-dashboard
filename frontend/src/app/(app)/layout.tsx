import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/** Everything behind a session shares the sidebar chrome and the auth guard. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
