package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.ReportReview;
import com.sisenco.weeklyreport.domain.ReviewAction;
import java.time.Instant;
import java.time.LocalDate;

/**
 * One entry in the dashboard activity feed: a report approved, or sent back for
 * correction.
 *
 * <p>Built from the review audit trail rather than a separate events table. Every
 * review action is already recorded permanently, so the feed is a view over data
 * that has to exist anyway.
 */
public record ActivityItemResponse(
        Long id,
        ReviewAction action,
        String comment,
        String reviewerName,
        String memberName,
        Long reportId,
        LocalDate weekStart,
        int versionNo,
        Instant createdAt) {

    public static ActivityItemResponse from(ReportReview review) {
        return new ActivityItemResponse(
                review.getId(),
                review.getAction(),
                review.getComment(),
                review.getReviewer().getName(),
                review.getReport().getUser().getName(),
                review.getReport().getId(),
                review.getReport().getWeekStart(),
                review.getVersion().getVersionNo(),
                review.getCreatedAt());
    }
}
