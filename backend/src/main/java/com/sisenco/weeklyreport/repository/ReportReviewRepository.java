package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.ReportReview;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReportReviewRepository extends JpaRepository<ReportReview, Long> {

    /** Full comment history for one report, newest first. */
    List<ReportReview> findByReportIdOrderByCreatedAtDesc(Long reportId);

    /**
     * Recent review actions across the team, for the dashboard activity feed.
     * Joins are eager here because the feed renders reviewer and owner names.
     */
    @Query(
            value =
                    """
                    select rv from ReportReview rv
                      join fetch rv.reviewer
                      join fetch rv.report r
                      join fetch r.user
                    """,
            countQuery = "select count(rv) from ReportReview rv")
    Page<ReportReview> findRecentActivity(Pageable pageable);
}
