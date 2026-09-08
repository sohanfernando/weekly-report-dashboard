import type { ReactNode } from "react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Everything behind a session shares the sidebar chrome and the auth guard.
 *
 * The assistant sits outside the shell because it floats over the page rather
 * than living in the layout. It renders nothing at all unless the viewer is a
 * manager and the deployment has the feature configured.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <ChatWidget />
    </>
  );
}
