package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportSection;
import com.sisenco.weeklyreport.domain.ReportStatus;
import com.sisenco.weeklyreport.domain.ReportVersion;
import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.SubmissionState;
import com.sisenco.weeklyreport.domain.TaskStatus;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.dto.response.ActivityItemResponse;
import com.sisenco.weeklyreport.dto.response.DashboardSummaryResponse;
import com.sisenco.weeklyreport.dto.response.MemberStatsResponse;
import com.sisenco.weeklyreport.dto.response.MemberStatusBreakdownResponse;
import com.sisenco.weeklyreport.dto.response.MemberSubmissionResponse;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.ProjectWorkloadResponse;
import com.sisenco.weeklyreport.dto.response.TaskTypeHoursResponse;
import com.sisenco.weeklyreport.dto.response.TeamSectionItemResponse;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.dto.response.WeeklyTrendPointResponse;
import com.sisenco.weeklyreport.exception.NotFoundException;
import com.sisenco.weeklyreport.repository.DashboardRepository;
import com.sisenco.weeklyreport.repository.ReportRepository;
import com.sisenco.weeklyreport.repository.ReportReviewRepository;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.service.DashboardService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    /** Default window for the trend charts when the caller gives no range. */
    private static final int DEFAULT_TREND_WEEKS = 8;

    private final DashboardRepository dashboardRepository;
    private final ReportRepository reportRepository;
    private final ReportReviewRepository reviewRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(LocalDate weekStart) {
        LocalDate week = mondayOf(weekStart);
        LocalDate weekEnd = week.plusDays(6);

        // Derived from the same per-member list the submissions endpoint returns,
        // so the headline numbers can never disagree with the table beneath them.
        List<MemberSubmissionResponse> states = submissionStatus(week);

        Map<SubmissionState, Long> counts = states.stream()
                .collect(Collectors.groupingBy(
                        MemberSubmissionResponse::state, () -> new EnumMap<>(SubmissionState.class), Collectors.counting()));

        long expected = states.size();
        long submitted = states.stream().filter(s -> s.state().countsAsSubmitted()).count();
        long drafts = counts.getOrDefault(SubmissionState.DRAFT, 0L);
        long notStarted = counts.getOrDefault(SubmissionState.NOT_STARTED, 0L);
        long outstanding = drafts + notStarted;

        // Pending and late are the same behaviour either side of the deadline.
        boolean weekClosed = LocalDate.now().isAfter(weekEnd);
        long pending = weekClosed ? 0 : outstanding;
        long late = weekClosed ? outstanding : 0;

        double complianceRate = expected == 0
                ? 0d
                : BigDecimal.valueOf(submitted * 100d / expected)
                        .setScale(1, RoundingMode.HALF_UP)
                        .doubleValue();

        return new DashboardSummaryResponse(
                week,
                weekEnd,
                weekClosed,
                expected,
                submitted,
                pending,
                late,
                notStarted,
                drafts,
                counts.getOrDefault(SubmissionState.SUBMITTED, 0L),
                counts.getOrDefault(SubmissionState.NEEDS_CORRECTION, 0L),
                counts.getOrDefault(SubmissionState.APPROVED, 0L),
                complianceRate,
                dashboardRepository.countOpenBlockersForWeek(week, ReportStatus.DRAFT));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberSubmissionResponse> submissionStatus(LocalDate weekStart) {
        LocalDate week = mondayOf(weekStart);

        // Only members are measured on filing reports; managers review them.
        List<User> members = userRepository.findByRoleAndActiveTrueOrderByNameAsc(Role.MEMBER);

        Map<Long, Report> byUser = reportRepository.findByWeekStartWithDetails(week).stream()
                .collect(Collectors.toMap(r -> r.getUser().getId(), Function.identity(), (a, b) -> a));

        return members.stream()
                .map(member -> {
                    Report report = byUser.get(member.getId());
                    ReportVersion version = report == null ? null : report.getCurrentVersion();
                    return new MemberSubmissionResponse(
                            member.getId(),
                            member.getName(),
                            member.getJobTitle(),
                            SubmissionState.from(report == null ? null : report.getStatus()),
                            report == null ? null : report.getId(),
                            version == null ? null : version.getVersionNo(),
                            report == null ? null : report.getSubmittedAt(),
                            report == null ? null : report.getReviewedAt());
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WeeklyTrendPointResponse> tasksTrend(LocalDate from, LocalDate to, Long userId) {
        Range range = Range.of(from, to);
        return dashboardRepository
                .tasksCompletedTrend(range.from(), range.to(), userId, TaskStatus.COMPLETED, ReportStatus.DRAFT)
                .stream()
                .map(point -> new WeeklyTrendPointResponse(
                        point.getWeekStart(), point.getReportCount(), point.getCompletedTasks(), point.getTotalTasks()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectWorkloadResponse> workloadByProject(LocalDate from, LocalDate to) {
        Range range = Range.of(from, to);
        return dashboardRepository.workloadByProject(range.from(), range.to(), ReportStatus.DRAFT).stream()
                .map(row -> new ProjectWorkloadResponse(
                        row.getProjectId(),
                        row.getProjectName(),
                        row.getProjectColor(),
                        row.getReportCount(),
                        row.getTaskCount(),
                        scale(row.getHoursSpent())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskTypeHoursResponse> timeByTaskType(LocalDate from, LocalDate to) {
        Range range = Range.of(from, to);
        return dashboardRepository.sumHoursByTaskType(range.from(), range.to(), ReportStatus.DRAFT).stream()
                .map(row -> new TaskTypeHoursResponse(row.getTaskType(), scale(row.getHours())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberStatusBreakdownResponse> statusByMember(LocalDate from, LocalDate to) {
        Range range = Range.of(from, to);

        // The query returns one row per (member, status); fold them into one row
        // per member so the chart can stack them directly.
        Map<Long, MemberStatusBreakdownResponse> byMember = new LinkedHashMap<>();
        for (var row : dashboardRepository.statusCountsByMember(range.from(), range.to(), ReportStatus.DRAFT)) {
            MemberStatusBreakdownResponse current = byMember.getOrDefault(
                    row.getUserId(), new MemberStatusBreakdownResponse(row.getUserId(), row.getUserName(), 0, 0, 0, 0));

            long submitted = current.submitted() + (row.getStatus() == ReportStatus.SUBMITTED ? row.getTotal() : 0);
            long needsCorrection =
                    current.needsCorrection() + (row.getStatus() == ReportStatus.NEEDS_CORRECTION ? row.getTotal() : 0);
            long approved = current.approved() + (row.getStatus() == ReportStatus.APPROVED ? row.getTotal() : 0);

            byMember.put(
                    row.getUserId(),
                    new MemberStatusBreakdownResponse(
                            row.getUserId(),
                            row.getUserName(),
                            submitted,
                            needsCorrection,
                            approved,
                            current.total() + row.getTotal()));
        }
        return List.copyOf(byMember.values());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ActivityItemResponse> activity(Pageable pageable) {
        return PageResponse.from(reviewRepository.findRecentActivity(pageable), ActivityItemResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberStatsResponse memberStats(Long userId) {
        User member = userRepository.findById(userId).orElseThrow(() -> NotFoundException.of("User", userId));

        Map<ReportStatus, Long> counts = new EnumMap<>(ReportStatus.class);
        dashboardRepository
                .countByStatusForMember(userId)
                .forEach(row -> counts.put(row.getStatus(), row.getTotal()));

        long drafts = counts.getOrDefault(ReportStatus.DRAFT, 0L);
        long awaitingReview = counts.getOrDefault(ReportStatus.SUBMITTED, 0L);
        long needsCorrection = counts.getOrDefault(ReportStatus.NEEDS_CORRECTION, 0L);
        long approved = counts.getOrDefault(ReportStatus.APPROVED, 0L);
        long total = drafts + awaitingReview + needsCorrection + approved;

        // Drafts are excluded from the denominator: a report nobody has been asked
        // to review cannot fairly count against an approval rate.
        long reviewable = total - drafts;
        double approvalRate = reviewable == 0
                ? 0d
                : BigDecimal.valueOf(approved * 100d / reviewable)
                        .setScale(1, RoundingMode.HALF_UP)
                        .doubleValue();

        var effort = dashboardRepository.effortTotalsForMember(userId, TaskStatus.COMPLETED, ReportStatus.DRAFT);

        return new MemberStatsResponse(
                UserResponse.from(member),
                total,
                drafts,
                awaitingReview,
                needsCorrection,
                approved,
                approvalRate,
                effort == null ? 0 : effort.getCompletedTasks(),
                effort == null ? 0 : effort.getTotalTasks(),
                effort == null ? BigDecimal.ZERO : scale(effort.getHoursSpent()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamSectionItemResponse> teamSection(LocalDate weekStart, ReportSection section) {
        LocalDate week = mondayOf(weekStart);

        List<TeamSectionItemResponse> items = new ArrayList<>();
        for (Report report : reportRepository.findByWeekStartWithDetails(week)) {
            if (report.getStatus() == ReportStatus.DRAFT || report.getCurrentVersion() == null) {
                continue;
            }
            ReportVersion version = report.getCurrentVersion();

            List<TeamSectionItemResponse.Entry> entries = section == ReportSection.BLOCKERS
                    ? version.getBlockers().stream()
                            .map(b -> new TeamSectionItemResponse.Entry(b.getDescription(), b.isKey(), b.isResolved()))
                            .toList()
                    : version.getAchievements().stream()
                            .map(a -> new TeamSectionItemResponse.Entry(a.getDescription(), a.isKey(), false))
                            .toList();

            items.add(new TeamSectionItemResponse(
                    report.getUser().getId(), report.getUser().getName(), report.getId(), entries));
        }
        items.sort(java.util.Comparator.comparing(TeamSectionItemResponse::userName));
        return items;
    }

    // --------------------------------------------------------------- helpers

    /** Snaps any date to the Monday of its week; null means the current week. */
    private LocalDate mondayOf(LocalDate date) {
        return (date == null ? LocalDate.now() : date).with(DayOfWeek.MONDAY);
    }

    private BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    /** An inclusive week range, defaulting to the last {@value #DEFAULT_TREND_WEEKS} weeks. */
    private record Range(LocalDate from, LocalDate to) {

        static Range of(LocalDate from, LocalDate to) {
            LocalDate end = (to == null ? LocalDate.now() : to).with(DayOfWeek.MONDAY);
            LocalDate start = from == null
                    ? end.minusWeeks(DEFAULT_TREND_WEEKS - 1L)
                    : from.with(DayOfWeek.MONDAY);
            // Tolerate a reversed range rather than silently returning nothing.
            return start.isAfter(end) ? new Range(end, start) : new Range(start, end);
        }
    }
}
