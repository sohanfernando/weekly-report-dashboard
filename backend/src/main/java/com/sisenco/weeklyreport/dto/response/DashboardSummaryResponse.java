package com.sisenco.weeklyreport.dto.response;

import java.time.LocalDate;

/**
 * The four headline metrics for one week (Section 6).
 *
 * @param expectedMembers active team members who were expected to file a report.
 *     Managers are excluded: they review reports rather than being measured on
 *     filing them.
 * @param submitted members who have sent the report for review at least once,
 *     whatever happened to it afterwards
 * @param pending members who have not submitted, while the week is still running
 * @param late members who have not submitted after the week has ended. Pending
 *     and late are the same behaviour seen before and after the deadline, so
 *     they are split by the calendar rather than stored.
 * @param complianceRate submitted as a percentage of expected, 0-100
 * @param openBlockers unresolved blockers across the team for this week
 */
public record DashboardSummaryResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        boolean weekClosed,
        long expectedMembers,
        long submitted,
        long pending,
        long late,
        long notStarted,
        long drafts,
        long awaitingReview,
        long needsCorrection,
        long approved,
        double complianceRate,
        long openBlockers) {}
