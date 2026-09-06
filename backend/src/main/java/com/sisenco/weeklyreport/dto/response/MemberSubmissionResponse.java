package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.SubmissionState;
import java.time.Instant;

/**
 * One team member's position for a week, including the case where they have
 * filed nothing at all.
 *
 * @param reportId null when the member has not started
 */
public record MemberSubmissionResponse(
        Long userId,
        String userName,
        String jobTitle,
        SubmissionState state,
        Long reportId,
        Integer versionNo,
        Instant submittedAt,
        Instant reviewedAt) {}
