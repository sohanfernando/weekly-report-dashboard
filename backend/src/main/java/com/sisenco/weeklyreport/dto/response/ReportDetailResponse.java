package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * A single report in full: metadata, the version currently in play, every past
 * version, and the whole review history.
 *
 * @param currentVersion what the member is editing, or what the manager is
 *     reviewing, depending on {@code status}
 * @param versions every snapshot including the current one, oldest first. This
 *     is what Section 3 asks for — past versions stay visible rather than being
 *     overwritten by a correction.
 * @param reviews every review action ever taken, newest first. The first entry
 *     is the comment a member in NEEDS_CORRECTION has to address.
 * @param editable whether the <em>caller</em> may change the content right now,
 *     so the frontend does not have to re-derive the workflow rules
 */
public record ReportDetailResponse(
        Long id,
        Long userId,
        String userName,
        String userEmail,
        Long projectId,
        String projectName,
        String projectColor,
        LocalDate weekStart,
        LocalDate weekEnd,
        ReportStatus status,
        boolean editable,
        Instant submittedAt,
        Instant reviewedAt,
        ReportVersionResponse currentVersion,
        List<ReportVersionResponse> versions,
        List<ReportReviewResponse> reviews,
        Instant createdAt,
        Instant updatedAt) {

    /** Call inside a transaction: versions and reviews are lazy collections. */
    public static ReportDetailResponse from(Report report, boolean editable) {
        var project = report.getProject();
        return new ReportDetailResponse(
                report.getId(),
                report.getUser().getId(),
                report.getUser().getName(),
                report.getUser().getEmail(),
                project == null ? null : project.getId(),
                project == null ? null : project.getName(),
                project == null ? null : project.getColor(),
                report.getWeekStart(),
                report.getWeekEnd(),
                report.getStatus(),
                editable,
                report.getSubmittedAt(),
                report.getReviewedAt(),
                report.getCurrentVersion() == null
                        ? null
                        : ReportVersionResponse.from(report.getCurrentVersion()),
                report.getVersions().stream()
                        .sorted(Comparator.comparingInt(v -> v.getVersionNo()))
                        .map(ReportVersionResponse::from)
                        .toList(),
                report.getReviews().stream()
                        .sorted(Comparator.comparing(
                                com.sisenco.weeklyreport.domain.ReportReview::getCreatedAt,
                                Comparator.reverseOrder()))
                        .map(ReportReviewResponse::from)
                        .toList(),
                report.getCreatedAt(),
                report.getUpdatedAt());
    }
}
