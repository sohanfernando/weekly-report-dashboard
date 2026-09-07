package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.domain.ReportStatus;
import com.sisenco.weeklyreport.dto.request.SaveReportRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.ReportDetailResponse;
import com.sisenco.weeklyreport.dto.response.ReportSummaryResponse;
import com.sisenco.weeklyreport.dto.response.ReportVersionResponse;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.ReportService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A member's own weekly reports (Section 2), plus the shared read-only views.
 *
 * <p>Filing a report is a MEMBER capability. Section 1 splits the two roles by
 * what they do — a team member "can create, edit, and submit their own weekly
 * reports", a manager "can view and analyze reports across all team members,
 * and review/approve" them — so a manager reviews reports rather than writing
 * them. The read endpoints below stay open to both, because a manager opens a
 * member's report to review it.
 *
 * <p>Every write takes the owner's id from the authenticated principal, not
 * from the request. There is no path by which a caller can name whose report
 * they are creating or editing.
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /** The caller's own report history, for the history page. */
    @GetMapping("/mine")
    @PreAuthorize("hasRole('MEMBER')")
    public PageResponse<ReportSummaryResponse> listOwn(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "weekStart", direction = Sort.Direction.DESC) Pageable pageable) {
        return reportService.listOwn(principal.getId(), status, projectId, from, to, pageable);
    }

    /** Read-only detail, used by both the member and a reviewing manager. */
    @GetMapping("/{reportId}")
    public ReportDetailResponse get(
            @PathVariable Long reportId, @AuthenticationPrincipal AppUserPrincipal principal) {
        return reportService.get(reportId, principal);
    }

    /** Past versions of this week's report, for the version-history view. */
    @GetMapping("/{reportId}/versions")
    public List<ReportVersionResponse> versions(
            @PathVariable Long reportId, @AuthenticationPrincipal AppUserPrincipal principal) {
        return reportService.versions(reportId, principal);
    }

    @PostMapping
    @PreAuthorize("hasRole('MEMBER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportDetailResponse create(
            @Valid @RequestBody SaveReportRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        return reportService.createDraft(principal.getId(), request);
    }

    @PutMapping("/{reportId}")
    @PreAuthorize("hasRole('MEMBER')")
    public ReportDetailResponse update(
            @PathVariable Long reportId,
            @Valid @RequestBody SaveReportRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        return reportService.update(reportId, principal.getId(), request);
    }

    /** Sends the report for review. Also the resubmit action after corrections. */
    @PostMapping("/{reportId}/submit")
    @PreAuthorize("hasRole('MEMBER')")
    public ReportDetailResponse submit(
            @PathVariable Long reportId, @AuthenticationPrincipal AppUserPrincipal principal) {
        return reportService.submit(reportId, principal.getId());
    }
}
