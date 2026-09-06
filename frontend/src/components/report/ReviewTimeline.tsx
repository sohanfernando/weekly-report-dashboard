"use client";

import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dateTime } from "@/lib/format";
import type { ReportReview } from "@/lib/types";

/**
 * Every review action taken on a report, newest first.
 *
 * Each entry names the version it was written against, so an old comment cannot
 * be mistaken for feedback on the latest resubmission.
 */
export function ReviewTimeline({ reviews }: { reviews: ReportReview[] }) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader title="Review history" />
        <CardBody>
          <p className="text-sm text-secondary">Not reviewed yet.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Review history" description={`${reviews.length} action${reviews.length === 1 ? "" : "s"}`} />
      <CardBody className="space-y-3">
        {reviews.map((review) => {
          const approved = review.action === "APPROVE";
          return (
            <div key={review.id} className="flex gap-3">
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  approved
                    ? "bg-status-approved/10 text-status-approved"
                    : "bg-status-correction/10 text-status-correction",
                )}
              >
                {approved ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <MessageSquareWarning className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-primary">
                  <span className="font-medium">{review.reviewerName}</span>{" "}
                  {approved ? "approved" : "requested changes on"}{" "}
                  <span className="text-secondary">version {review.versionNo}</span>
                </p>
                <p className="text-xs text-secondary">{dateTime(review.createdAt)}</p>
                {review.comment && (
                  <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-surface-muted px-3 py-2 text-sm text-primary">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
