package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.ReportReview;
import com.sisenco.weeklyreport.domain.ReviewAction;
import java.time.Instant;

/**
 * One review action in a report's history.
 *
 * @param versionNo which snapshot the comment was written against, so the
 *     member can tell an old comment from one aimed at their latest resubmission
 */
public record ReportReviewResponse(
        Long id, ReviewAction action, String comment, String reviewerName, int versionNo, Instant createdAt) {

    public static ReportReviewResponse from(ReportReview review) {
        return new ReportReviewResponse(
                review.getId(),
                review.getAction(),
                review.getComment(),
                review.getReviewer().getName(),
                review.getVersion().getVersionNo(),
                review.getCreatedAt());
    }
}
