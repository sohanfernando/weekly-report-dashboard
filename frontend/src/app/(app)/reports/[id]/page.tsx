"use client";

import { ArrowLeft, MessageSquareWarning, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ReportView } from "@/components/report/ReportView";
import { ReviewTimeline } from "@/components/report/ReviewTimeline";
import { VersionHistory } from "@/components/report/VersionHistory";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Loading,
  StatusBadge,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { dateTime, weekRangeLabel } from "@/lib/format";
import { useMe, useReport, useSubmitReport } from "@/lib/queries";

/**
 * Read-only view of one report, used by the owner and by a manager alike.
 *
 * What the viewer may do is decided by the API, not guessed here: the payload
 * carries an `editable` flag for the current caller.
 */
export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = Number(params.id);
  const router = useRouter();

  const { data: me } = useMe();
  const { data: report, isPending, error } = useReport(reportId);
  const submitReport = useSubmitReport();
  const [actionError, setActionError] = useState<string | null>(null);

  if (isPending) return <Loading label="Loading report" />;

  if (error || !report) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Card>
        <EmptyState
          title={notFound ? "Report not found" : "Could not load this report"}
          description={
            notFound
              ? "It may have been removed, or it belongs to someone else."
              : "Try refreshing the page."
          }
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

  const isOwner = me?.id === report.userId;
  const isManager = me?.role === "MANAGER";
  const latestReview = report.reviews[0];
  const needsCorrection = report.status === "NEEDS_CORRECTION";

  return (
    <>
      <div className="mb-5">
        <Link
          href={isOwner ? "/reports" : "/review"}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {isOwner ? "My reports" : "Review queue"}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground">
              {weekRangeLabel(report.weekStart, report.weekEnd)}
            </h1>
            <StatusBadge state={report.status} />
            {report.currentVersion && (
              <Badge>v{report.currentVersion.versionNo}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {isOwner ? "Your report" : report.userName}
            {report.projectName && ` · ${report.projectName}`}
            {report.submittedAt && ` · submitted ${dateTime(report.submittedAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {report.editable && (
            <Link href={`/reports/${report.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="size-4" /> Edit
              </Button>
            </Link>
          )}
          {report.editable && (
            <Button
              loading={submitReport.isPending}
              onClick={() => {
                setActionError(null);
                submitReport.mutate(report.id, {
                  onError: (err) =>
                    setActionError(err instanceof ApiError ? err.message : "Could not submit."),
                });
              }}
            >
              <Send className="size-4" />
              {needsCorrection ? "Resubmit" : "Submit for review"}
            </Button>
          )}
          {isManager && !isOwner && report.status === "SUBMITTED" && (
            <Button onClick={() => router.push(`/review/${report.id}`)}>Review this report</Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-5">
          <Alert>{actionError}</Alert>
        </div>
      )}

      {/* The manager's latest comment is the first thing the owner needs to see. */}
      {needsCorrection && latestReview?.comment && (
        <div className="mb-5">
          <Card className="ring-amber-300 dark:ring-amber-900">
            <CardBody>
              <div className="flex gap-3">
                <MessageSquareWarning className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {latestReview.reviewerName} asked for changes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {latestReview.comment}
                  </p>
                  <p className="mt-1.5 text-xs text-muted">
                    On version {latestReview.versionNo} · {dateTime(latestReview.createdAt)}
                    {report.currentVersion &&
                      latestReview.versionNo !== report.currentVersion.versionNo &&
                      ` · you are now editing version ${report.currentVersion.versionNo}`}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="space-y-5">
        {report.currentVersion ? (
          <ReportView version={report.currentVersion} />
        ) : (
          <Card>
            <EmptyState title="This report has no content yet" />
          </Card>
        )}

        <ReviewTimeline reviews={report.reviews} />

        <VersionHistory
          versions={report.versions}
          currentVersionNo={report.currentVersion?.versionNo ?? null}
        />
      </div>
    </>
  );
}
