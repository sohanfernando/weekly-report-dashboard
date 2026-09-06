"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui";
import { useMe } from "@/lib/queries";

/**
 * The landing route just forwards to wherever the signed-in user actually
 * works: a manager starts on the dashboard, a member on their own reports.
 */
export default function HomePage() {
  const { data: user, isPending } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "MANAGER" ? "/dashboard" : "/reports");
  }, [isPending, user, router]);

  return <Loading label="Taking you to your workspace" />;
}
