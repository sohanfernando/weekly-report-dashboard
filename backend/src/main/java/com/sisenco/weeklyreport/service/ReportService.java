package com.sisenco.weeklyreport.service;

import com.sisenco.weeklyreport.domain.ReportStatus;
import com.sisenco.weeklyreport.dto.request.ReviewReportRequest;
import com.sisenco.weeklyreport.dto.request.SaveReportRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.ReportDetailResponse;
import com.sisenco.weeklyreport.dto.response.ReportSummaryResponse;
import com.sisenco.weeklyreport.dto.response.ReportVersionResponse;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;

/**
 * Weekly reports and the review cycle between a member and their manager
 * (Sections 2 and 3 of the brief).
 *
 * <h2>The lifecycle</h2>
 *
 * <pre>
 *   DRAFT ──submit──▶ SUBMITTED ──approve─────────▶ APPROVED
 *     ▲                    │
 *     │                    └──request changes──▶ NEEDS_CORRECTION
 *     │                                                │
 *     └──────────── same report, next version ─────────┘
 *                        resubmit ▶ SUBMITTED
 * </pre>
 *
 * <h2>Why versions exist</h2>
 *
 * A report is not one mutable row. Content lives in snapshots, and exactly one
 * snapshot at a time is editable. Submitting freezes the current one; requesting
 * changes clones it into the next version number and marks the clone editable.
 * Frozen snapshots are never touched again, which is what lets a manager see
 * every past version of a week alongside the one under review, and lets each
 * comment point at the exact version it was written about.
 *
 * <h2>Who may do what</h2>
 *
 * <ul>
 *   <li>A member sees and edits only their own reports.
 *   <li>A manager sees every member's report <em>except</em> drafts, which the
 *       brief makes owner-only, and may change only status and comments — there
 *       is deliberately no path here for a manager to rewrite report content.
 *   <li>A manager cannot review their own report.
 * </ul>
 *
 * @see com.sisenco.weeklyreport.service.impl.ReportServiceImpl
 */
public interface ReportService {

    // ---------------------------------------------------------------- member

    /** The caller's own report history, newest week first. */
    PageResponse<ReportSummaryResponse> listOwn(
            Long userId, ReportStatus status, Long projectId, LocalDate from, LocalDate to, Pageable pageable);

    /**
     * Creates this week's report as a draft.
     *
     * @throws com.sisenco.weeklyreport.exception.ConflictException if the member
     *     already has a report for that week
     * @throws com.sisenco.weeklyreport.exception.BadRequestException if
     *     {@code weekStart} is not a Monday
     */
    ReportDetailResponse createDraft(Long userId, SaveReportRequest request);

    /**
     * Replaces the content of the editable version.
     *
     * @throws com.sisenco.weeklyreport.exception.ForbiddenException if the
     *     caller does not own the report
     * @throws com.sisenco.weeklyreport.exception.ConflictException if the report
     *     is SUBMITTED or APPROVED, and so not open for editing
     */
    ReportDetailResponse update(Long reportId, Long userId, SaveReportRequest request);

    /**
     * Submits for review, freezing the current version. Works both for a first
     * submission and for a resubmission after corrections.
     */
    ReportDetailResponse submit(Long reportId, Long userId);

    // --------------------------------------------------------------- manager

    /** Every member's reports, filtered for the team dashboard. Excludes drafts. */
    PageResponse<ReportSummaryResponse> listTeam(
            Long userId,
            ReportStatus status,
            Long projectId,
            LocalDate weekStart,
            LocalDate from,
            LocalDate to,
            Pageable pageable);

    /**
     * Approves the report, or sends it back with a comment.
     *
     * <p>Requesting changes writes the comment against the version just
     * reviewed, then opens a fresh copy for the member to edit.
     *
     * @throws com.sisenco.weeklyreport.exception.ConflictException if the report
     *     is not awaiting review, if changes are requested without a comment, or
     *     if a manager tries to review their own report
     */
    ReportDetailResponse review(Long reportId, Long managerId, ReviewReportRequest request);

    // ---------------------------------------------------------------- shared

    /** Full report. Visible to its owner, or to a manager once it leaves DRAFT. */
    ReportDetailResponse get(Long reportId, AppUserPrincipal caller);

    /** Every snapshot of this report, oldest first. */
    List<ReportVersionResponse> versions(Long reportId, AppUserPrincipal caller);
}
