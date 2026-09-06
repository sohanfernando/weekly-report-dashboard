package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportStatus;
import com.sisenco.weeklyreport.domain.TaskStatus;
import com.sisenco.weeklyreport.domain.TaskType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Read-only aggregate queries behind the manager dashboard.
 *
 * <p>Separate from {@link ReportRepository} because nothing here loads an entity
 * — these are numbers for charts, computed in the database rather than by
 * pulling every report into memory and summing in Java.
 *
 * <p>Results come back as Spring Data interface projections, bound by column
 * alias. That keeps them type-safe without JPQL constructor expressions, which
 * are brittle when an aggregate's type is not obvious.
 *
 * <p>Every query aggregates the report's <em>current</em> version, so the numbers
 * reflect the latest content of each week rather than a superseded draft, and
 * drafts are excluded throughout since they are private to their author.
 */
public interface DashboardRepository extends Repository<Report, Long> {

    interface StatusCount {
        ReportStatus getStatus();

        long getTotal();
    }

    interface TaskTypeHours {
        TaskType getTaskType();

        BigDecimal getHours();
    }

    interface WeeklyTrendPoint {
        LocalDate getWeekStart();

        long getReportCount();

        long getCompletedTasks();

        long getTotalTasks();
    }

    interface ProjectWorkload {
        Long getProjectId();

        String getProjectName();

        String getProjectColor();

        long getReportCount();

        long getTaskCount();

        BigDecimal getHoursSpent();
    }

    interface MemberStatusCount {
        Long getUserId();

        String getUserName();

        ReportStatus getStatus();

        long getTotal();
    }

    interface EffortTotals {
        BigDecimal getHoursSpent();

        long getCompletedTasks();

        long getTotalTasks();
    }

    /** How many reports sit in each status for one week. */
    @Query(
            """
            select r.status as status, count(r) as total
            from Report r
            where r.weekStart = :week
            group by r.status
            """)
    List<StatusCount> countByStatusForWeek(@Param("week") LocalDate week);

    /**
     * Unresolved blockers on the current version of every non-draft report in the
     * week. Counted per week, so the figure tracks the week being viewed rather
     * than accumulating forever.
     */
    @Query(
            """
            select count(b)
            from VersionBlocker b
            where b.resolved = false
              and b.version.id in (
                    select r.currentVersion.id from Report r
                    where r.weekStart = :week and r.status <> :draft)
            """)
    long countOpenBlockersForWeek(@Param("week") LocalDate week, @Param("draft") ReportStatus draft);

    /** Team-wide hours per task type: meetings versus development and so on. */
    @Query(
            """
            select h.taskType as taskType, coalesce(sum(h.hours), 0) as hours
            from VersionHours h
            where h.version.id in (
                    select r.currentVersion.id from Report r
                    where r.weekStart between :from and :to and r.status <> :draft)
            group by h.taskType
            order by h.taskType
            """)
    List<TaskTypeHours> sumHoursByTaskType(
            @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("draft") ReportStatus draft);

    /** Tasks completed per week, for the trend line. */
    @Query(
            """
            select r.weekStart as weekStart,
                   count(distinct r.id) as reportCount,
                   coalesce(sum(case when t.status = :completed then 1 else 0 end), 0) as completedTasks,
                   count(t.id) as totalTasks
            from Report r
              left join VersionTask t on t.version = r.currentVersion
            where r.weekStart between :from and :to
              and r.status <> :draft
              and (:userId is null or r.user.id = :userId)
            group by r.weekStart
            order by r.weekStart
            """)
    List<WeeklyTrendPoint> tasksCompletedTrend(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("userId") Long userId,
            @Param("completed") TaskStatus completed,
            @Param("draft") ReportStatus draft);

    /** Workload distribution across projects. */
    @Query(
            """
            select p.id as projectId,
                   p.name as projectName,
                   p.color as projectColor,
                   count(distinct r.id) as reportCount,
                   count(t.id) as taskCount,
                   coalesce(sum(t.hoursSpent), 0) as hoursSpent
            from Report r
              join r.project p
              left join VersionTask t on t.version = r.currentVersion
            where r.weekStart between :from and :to and r.status <> :draft
            group by p.id, p.name, p.color
            order by p.name
            """)
    List<ProjectWorkload> workloadByProject(
            @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("draft") ReportStatus draft);

    /** Approval status per team member, for the stacked bar on the dashboard. */
    @Query(
            """
            select u.id as userId, u.name as userName, r.status as status, count(r) as total
            from Report r
              join r.user u
            where r.weekStart between :from and :to and r.status <> :draft
            group by u.id, u.name, r.status
            order by u.name
            """)
    List<MemberStatusCount> statusCountsByMember(
            @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("draft") ReportStatus draft);

    /** Lifetime effort totals for one member, for their profile page. */
    @Query(
            """
            select coalesce(sum(t.hoursSpent), 0) as hoursSpent,
                   coalesce(sum(case when t.status = :completed then 1 else 0 end), 0) as completedTasks,
                   count(t.id) as totalTasks
            from Report r
              left join VersionTask t on t.version = r.currentVersion
            where r.user.id = :userId and r.status <> :draft
            """)
    EffortTotals effortTotalsForMember(
            @Param("userId") Long userId,
            @Param("completed") TaskStatus completed,
            @Param("draft") ReportStatus draft);

    /** Every status count for one member, across all weeks. */
    @Query(
            """
            select r.status as status, count(r) as total
            from Report r
            where r.user.id = :userId
            group by r.status
            """)
    List<StatusCount> countByStatusForMember(@Param("userId") Long userId);
}
