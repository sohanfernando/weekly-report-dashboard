package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.domain.ReportStatus;
import com.sisenco.weeklyreport.dto.request.ReviewReportRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.ReportDetailResponse;
import com.sisenco.weeklyreport.dto.response.ReportSummaryResponse;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.ReportService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The manager's view of the team's reports (Sections 3 and 4).
 *
 * <p>Note what this controller does <em>not</em> expose: there is no endpoint
 * for a manager to change report content. The brief allows a manager to edit
 * status and comments only, and the absence of a write path is what enforces
 * that — not a check that could be forgotten.
 */
@RestController
@RequestMapping("/api/manager/reports")
@PreAuthorize("hasRole('MANAGER')")
@RequiredArgsConstructor
public class ManagerReportController {

    private final ReportService reportService;

    /**
     * The team dashboard list. Every filter combines with the others.
     *
     * @param userId filter to one team member
     * @param weekStart show exactly one week
     * @param from lower bound of a date range, inclusive
     * @param to upper bound of a date range, inclusive
     */
    @GetMapping
    public PageResponse<ReportSummaryResponse> listTeam(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20, sort = "weekStart", direction = Sort.Direction.DESC) Pageable pageable) {
        return reportService.listTeam(userId, status, projectId, weekStart, from, to, pageable);
    }

    /** Approve, or send back with a comment. Backs the manager review page. */
    @PostMapping("/{reportId}/review")
    public ReportDetailResponse review(
            @PathVariable Long reportId,
            @Valid @RequestBody ReviewReportRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        return reportService.review(reportId, principal.getId(), request);
    }
}
