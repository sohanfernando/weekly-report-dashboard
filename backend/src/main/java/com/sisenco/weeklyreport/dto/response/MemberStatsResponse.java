package com.sisenco.weeklyreport.dto.response;

import java.math.BigDecimal;

/**
 * Headline numbers for one team member, shown on their profile page alongside
 * their report history (Section 7).
 *
 * @param approvalRate approved reports as a percentage of those ever submitted,
 *     0-100. Drafts are excluded, since a report nobody has been asked to review
 *     cannot fairly count against an approval rate.
 */
public record MemberStatsResponse(
        UserResponse member,
        long totalReports,
        long drafts,
        long awaitingReview,
        long needsCorrection,
        long approved,
        double approvalRate,
        long completedTasks,
        long totalTasks,
        BigDecimal hoursSpent) {}
