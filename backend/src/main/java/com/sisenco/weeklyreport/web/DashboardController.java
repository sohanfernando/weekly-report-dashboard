package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.domain.ReportSection;
import com.sisenco.weeklyreport.dto.response.ActivityItemResponse;
import com.sisenco.weeklyreport.dto.response.DashboardSummaryResponse;
import com.sisenco.weeklyreport.dto.response.MemberStatsResponse;
import com.sisenco.weeklyreport.dto.response.MemberStatusBreakdownResponse;
import com.sisenco.weeklyreport.dto.response.MemberSubmissionResponse;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.ProjectWorkloadResponse;
import com.sisenco.weeklyreport.dto.response.TaskTypeHoursResponse;
import com.sisenco.weeklyreport.dto.response.TeamSectionItemResponse;
import com.sisenco.weeklyreport.dto.response.WeeklyTrendPointResponse;
import com.sisenco.weeklyreport.service.DashboardService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The manager dashboard (Sections 4 and 6).
 *
 * <p>Every date parameter is optional. Omitting {@code weekStart} means the
 * current week; omitting a range means the last eight weeks. Any day of a week
 * is accepted and snapped to that week's Monday, so a date picker does not have
 * to know the convention.
 */
@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER')")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /** Reports submitted, compliance rate, corrections outstanding, open blockers. */
    @GetMapping("/dashboard/summary")
    public DashboardSummaryResponse summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return dashboardService.summary(weekStart);
    }

    /** Per-member status for a week, including members who have not started. */
    @GetMapping("/dashboard/submissions")
    public List<MemberSubmissionResponse> submissions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return dashboardService.submissionStatus(weekStart);
    }

    /** Tasks completed over time, team-wide or for one member. */
    @GetMapping("/dashboard/tasks-trend")
    public List<WeeklyTrendPointResponse> tasksTrend(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long userId) {
        return dashboardService.tasksTrend(from, to, userId);
    }

    /** Workload distribution by project. */
    @GetMapping("/dashboard/workload-by-project")
    public List<ProjectWorkloadResponse> workloadByProject(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return dashboardService.workloadByProject(from, to);
    }

    /** Team-wide time split by task type. */
    @GetMapping("/dashboard/time-by-task-type")
    public List<TaskTypeHoursResponse> timeByTaskType(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return dashboardService.timeByTaskType(from, to);
    }

    /** Submission and approval outcomes per team member. */
    @GetMapping("/dashboard/status-by-member")
    public List<MemberStatusBreakdownResponse> statusByMember(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return dashboardService.statusByMember(from, to);
    }

    /** Recent approvals and correction requests. */
    @GetMapping("/dashboard/activity")
    public PageResponse<ActivityItemResponse> activity(
            @PageableDefault(size = 15, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return dashboardService.activity(pageable);
    }

    /** One section across the whole team for a week, side by side. */
    @GetMapping("/dashboard/section")
    public List<TeamSectionItemResponse> section(
            @RequestParam ReportSection section,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return dashboardService.teamSection(weekStart, section);
    }

    /** Headline numbers for one team member's profile page. */
    @GetMapping("/members/{userId}/stats")
    public MemberStatsResponse memberStats(@PathVariable Long userId) {
        return dashboardService.memberStats(userId);
    }
}
