package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Filtering for the list endpoints is done with {@link JpaSpecificationExecutor}
 * rather than a combinatorial explosion of derived query methods: the dashboard
 * can filter by member, project, status and date range in any combination.
 *
 * @see com.sisenco.weeklyreport.repository.ReportSpecifications
 */
public interface ReportRepository extends JpaRepository<Report, Long>, JpaSpecificationExecutor<Report> {

    Optional<Report> findByUserIdAndWeekStart(Long userId, LocalDate weekStart);

    boolean existsByUserIdAndWeekStart(Long userId, LocalDate weekStart);

    /** Guards project deletion: a project any report references may only be archived. */
    boolean existsByProjectId(Long projectId);

    /**
     * Every report filed for one week, with the associations the dashboard reads,
     * so building the per-member status list costs one query rather than one per
     * team member.
     */
    @Query(
            """
            select distinct r from Report r
              join fetch r.user
              left join fetch r.project
              left join fetch r.currentVersion
            where r.weekStart = :weekStart
            """)
    List<Report> findByWeekStartWithDetails(@Param("weekStart") LocalDate weekStart);

    /** Ids of members who already have a report for a week, for compliance stats. */
    @Query("select r.user.id from Report r where r.weekStart = :weekStart")
    List<Long> findUserIdsWithReportForWeek(@Param("weekStart") LocalDate weekStart);

    long countByWeekStartAndStatus(LocalDate weekStart, ReportStatus status);

    long countByStatus(ReportStatus status);

    /**
     * Fetches a report with everything the detail view needs in one query, so
     * rendering a report does not fan out into a lazy-loading N+1.
     */
    @Query(
            """
            select distinct r from Report r
              left join fetch r.user
              left join fetch r.project
              left join fetch r.versions v
            where r.id = :id
            """)
    Optional<Report> findByIdWithVersions(@Param("id") Long id);
}
