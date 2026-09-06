"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReportForm } from "@/components/report/ReportForm";
import { Alert, Loading, PageHeader } from "@/components/ui";
import { mondayOf } from "@/lib/format";
import { useMyReports } from "@/lib/queries";

function NewReportPage() {
  const searchParams = useSearchParams();
  const week = searchParams.get("week") ?? mondayOf();

  // One report per person per week, so warn before the API rejects the save.
  const { data: existing } = useMyReports({ from: week, to: week, size: 1 });
  const clash = existing?.content?.[0];

  return (
    <>
      <PageHeader
        title="New weekly report"
        description="Save it as a draft while you work, then submit it for review."
      />

      {clash && (
        <div className="mb-5">
          <Alert tone="warning">
            You already have a report for this week.{" "}
            <Link href={`/reports/${clash.id}`} className="font-medium underline">
              Open it instead
            </Link>{" "}
            or pick a different week below.
          </Alert>
        </div>
      )}

      <ReportForm defaultWeek={week} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <NewReportPage />
    </Suspense>
  );
}
