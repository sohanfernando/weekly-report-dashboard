"use client";

import { ArrowLeft, CheckCircle2, MessageSquareWarning } from "lucide-react";
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
  CardHeader,
  EmptyState,
  Field,
  Loading,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { dateTime, weekRangeLabel } from "@/lib/format";
import { useReport, useReviewReport } from "@/lib/queries";

/**
 * The manager review page: the report on the left, the decision on the right.
 *
 * There is no way to edit report content here, by design — a manager may change
 * only the status and leave a comment, and the API has no endpoint that would
 * let them do otherwise.
 */
export default function ReviewReportPage() {
  const params = useParams<{ id: string }>();
  const reportId = Number(params.id);
  const router = useRouter();

  const { data: report, isPending, error } = useReport(reportId);
  const review = useReviewReport();

  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isPending) return <Loading label="Loading report" />;

  if (error || !report) {
    return (
      <Card>
        <EmptyState
          title="Could not load this report"
          description={
            error instanceof ApiError && error.status === 404
              ? "It may have been withdrawn, or it is still a draft."
              : undefined
          }
          action={
            <Link href="/review">
              <Button variant="secondary" size="sm">
                Back to the queue
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const awaitingReview = report.status === "SUBMITTED";

  function act(action: "APPROVE" | "REQUEST_CHANGES") {
    setActionError(null);
    setCommentError(null);

    // The API enforces this too; checking here saves a round trip and keeps the
    // message next to the box they need to fill in.
    if (action === "REQUEST_CHANGES" && !comment.trim()) {
      setCommentError("Explain what needs correcting before sending it back.");
      return;
    }

    review.mutate(
      { id: reportId, action, comment: comment.trim() || undefined },
      {
        onSuccess: () => router.push("/review"),
        onError: (err) =>
          setActionError(err instanceof ApiError ? err.message : "Could not record the review."),
      },
    );
  }

  return (
    <>
      <div className="mb-5">
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Review queue
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground">{report.userName}</h1>
            <StatusBadge state={report.status} />
            {report.currentVersion && <Badge>v{report.currentVersion.versionNo}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {weekRangeLabel(report.weekStart, report.weekEnd)}
            {report.projectName && ` · ${report.projectName}`}
            {report.submittedAt && ` · submitted ${dateTime(report.submittedAt)}`}
          </p>
        </div>
        <Link href={`/team/${report.userId}`}>
          <Button variant="secondary" size="sm">
            View member profile
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {report.currentVersion ? (
            <ReportView version={report.currentVersion} />
          ) : (
            <Card>
              <EmptyState title="This report has no content" />
            </Card>
          )}
          <VersionHistory
            versions={report.versions}
            currentVersionNo={report.currentVersion?.versionNo ?? null}
          />
        </div>

        <div className="space-y-5">
          <Card className="xl:sticky xl:top-6">
            <CardHeader
              title="Your decision"
              description={
                awaitingReview
                  ? `Reviewing version ${report.currentVersion?.versionNo ?? 1}`
                  : "This report is not awaiting review."
              }
            />
            <CardBody className="space-y-4">
              {actionError && <Alert>{actionError}</Alert>}

              {awaitingReview ? (
                <>
                  <Field
                    label="Comment"
                    htmlFor="comment"
                    error={commentError ?? undefined}
                    hint="Required when requesting changes, optional when approving."
                  >
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(event) => {
                        setComment(event.target.value);
                        if (commentError) setCommentError(null);
                      }}
                      invalid={!!commentError}
                      placeholder="What should change, or what went well?"
                    />
                  </Field>

                  <div className="flex flex-col gap-2">
                    <Button onClick={() => act("APPROVE")} loading={review.isPending}>
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => act("REQUEST_CHANGES")}
                      loading={review.isPending}
                    >
                      <MessageSquareWarning className="size-4" /> Request changes
                    </Button>
                  </div>

                  <p className="text-xs text-muted">
                    Requesting changes opens a fresh version for {report.userName.split(" ")[0]} to
                    edit. The version you are reading now is kept exactly as it is.
                  </p>
                </>
              ) : (
                <Alert tone={report.status === "APPROVED" ? "success" : "info"}>
                  {report.status === "APPROVED"
                    ? "This report has been approved. No further action is needed."
                    : report.status === "NEEDS_CORRECTION"
                      ? "Sent back for correction. It will return here once resubmitted."
                      : "This report is still a draft."}
                </Alert>
              )}
            </CardBody>
          </Card>

          <ReviewTimeline reviews={report.reviews} />
        </div>
      </div>
    </>
  );
}
