"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loading } from "@/components/ui";
import { useMe } from "@/lib/queries";

/**
 * Keeps managers out of the member-only report screens.
 *
 * Section 1 gives creating, editing and submitting a report to the team member
 * and reviewing to the manager, so a manager has no report of their own to
 * write. The API enforces that; this only spares them a 403 page they can do
 * nothing about, and sends them where their work actually is.
 *
 * The report *detail* view is deliberately not wrapped: a manager opens a
 * member's report there to review it.
 */
export function MemberOnly({ children }: Readonly<{ children: ReactNode }>) {
  const { data: user, isPending } = useMe();
  const router = useRouter();
  const blocked = !!user && user.role !== "MEMBER";

  useEffect(() => {
    if (blocked) {
      router.replace("/dashboard");
    }
  }, [blocked, router]);

  if (isPending) return <Loading />;
  if (blocked) return <Loading label="Taking you to the dashboard" />;

  return <>{children}</>;
}
