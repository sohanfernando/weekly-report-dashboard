"use client";

import { ArrowLeft, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { ReportForm } from "@/components/report/ReportForm";
import { Alert, Button, Card, EmptyState, Loading, PageHeader } from "@/components/ui";
import { dateTime, weekRangeLabel } from "@/lib/format";
import { useReport } from "@/lib/queries";

export default function EditReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = Number(params.id);
  const { data: report, isPending, error } = useReport(reportId);

  if (isPending) return <Loading label="Loading report" />;

  if (error || !report) {
    return (
      <Card>
        <EmptyState
          title="Could not load this report"
          action={
            <Link href="/reports">
              <Button variant="secondary" size="sm">
                Back to my reports
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  // The API is the authority on whether editing is allowed; mirror its answer
  // rather than re-deriving the workflow rules here.
  if (!report.editable) {
    return (
      <Card>
        <EmptyState
          title="This report is not open for editing"
          description={
            report.status === "SUBMITTED"
              ? "It is with your manager for review. You can edit it again if they send it back."
              : "Approved reports are final."
          }
          action={
            <Link href={`/reports/${report.id}`}>
              <Button variant="secondary" size="sm">
                View the report
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const latestReview = report.reviews[0];

  return (
    <>
      <div className="mb-5">
        <Link
          href={`/reports/${report.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to the report
        </Link>
      </div>

      <PageHeader
        title={`Editing ${weekRangeLabel(report.weekStart, report.weekEnd)}`}
        description={
          report.status === "NEEDS_CORRECTION"
            ? `You are editing version ${report.currentVersion?.versionNo}. The version your manager reviewed is kept unchanged.`
            : "Saved as a draft until you submit it."
        }
      />

      {report.status === "NEEDS_CORRECTION" && latestReview?.comment && (
        <div className="mb-5">
          <Alert tone="warning">
            <div className="flex gap-2">
              <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">{latestReview.reviewerName} asked for changes</p>
                <p className="mt-1 whitespace-pre-wrap">{latestReview.comment}</p>
                <p className="mt-1 text-xs opacity-80">
                  On version {latestReview.versionNo} · {dateTime(latestReview.createdAt)}
                </p>
              </div>
            </div>
          </Alert>
        </div>
      )}

      <Reveal stagger="form > *">
        <ReportForm report={report} />
      </Reveal>
    </>
  );
}
