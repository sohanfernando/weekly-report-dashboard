package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportStatus;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A report as it appears in a list — history page, team dashboard, review queue.
 *
 * <p>Carries no version content, so listing a hundred reports does not drag
 * every task row along with it.
 */
public record ReportSummaryResponse(
        Long id,
        Long userId,
        String userName,
        Long projectId,
        String projectName,
        String projectColor,
        LocalDate weekStart,
        LocalDate weekEnd,
        ReportStatus status,
        Integer currentVersionNo,
        Instant submittedAt,
        Instant reviewedAt,
        Instant updatedAt) {

    public static ReportSummaryResponse from(Report report) {
        var project = report.getProject();
        var version = report.getCurrentVersion();
        return new ReportSummaryResponse(
                report.getId(),
                report.getUser().getId(),
                report.getUser().getName(),
                project == null ? null : project.getId(),
                project == null ? null : project.getName(),
                project == null ? null : project.getColor(),
                report.getWeekStart(),
                report.getWeekEnd(),
                report.getStatus(),
                version == null ? null : version.getVersionNo(),
                report.getSubmittedAt(),
                report.getReviewedAt(),
                report.getUpdatedAt());
    }
}
