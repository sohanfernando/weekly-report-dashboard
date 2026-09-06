package com.sisenco.weeklyreport.service;

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
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;

/**
 * Aggregated figures for the manager dashboard (Sections 4 and 6).
 *
 * <p>Two conventions hold throughout:
 *
 * <ul>
 *   <li>Any {@code weekStart} is snapped to the Monday of that week, so a caller
 *       passing any day of the week gets the answer they meant.
 *   <li>Drafts never contribute. They are private to their author, so counting
 *       them would leak the existence of work nobody has shared.
 * </ul>
 *
 * @see com.sisenco.weeklyreport.service.impl.DashboardServiceImpl
 */
public interface DashboardService {

    /** The four headline metrics for one week. */
    DashboardSummaryResponse summary(LocalDate weekStart);

    /**
     * Every active member's position for the week, including those who have filed
     * nothing — the "not yet started" case the brief asks to be trackable.
     */
    List<MemberSubmissionResponse> submissionStatus(LocalDate weekStart);

    /** Tasks completed per week, team-wide or for one member. */
    List<WeeklyTrendPointResponse> tasksTrend(LocalDate from, LocalDate to, Long userId);

    /** Task and hour distribution across projects. */
    List<ProjectWorkloadResponse> workloadByProject(LocalDate from, LocalDate to);

    /** Team-wide hours by task type: meetings versus development and so on. */
    List<TaskTypeHoursResponse> timeByTaskType(LocalDate from, LocalDate to);

    /** Report outcomes per member, for the stacked status chart. */
    List<MemberStatusBreakdownResponse> statusByMember(LocalDate from, LocalDate to);

    /** Recent approvals and correction requests, newest first. */
    PageResponse<ActivityItemResponse> activity(Pageable pageable);

    /** Headline numbers for one member's profile page. */
    MemberStatsResponse memberStats(Long userId);

    /**
     * One section of every member's report for a week, side by side, so a manager
     * can scan all the blockers or all the achievements without opening each
     * report in turn.
     */
    List<TeamSectionItemResponse> teamSection(LocalDate weekStart, ReportSection section);
}
