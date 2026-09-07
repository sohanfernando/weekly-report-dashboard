package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/**
 * The whole weekly report, as a single payload.
 *
 * <p>The field set is fixed and identical for everyone, as Section 2 requires:
 * there is no mechanism here for a user to add, rename or reorder a field.
 *
 * <p>Sent whole on every save rather than as a patch. The report is one document
 * that the member edits as a unit, so replacing it wholesale avoids the
 * ambiguity of "was this list omitted, or emptied?" and makes each save
 * idempotent.
 *
 * @param weekStart the Monday of the week being reported on; the service
 *     rejects any other day so one week can never be filed twice under two
 *     different dates
 */
public record SaveReportRequest(
        @NotNull(message = "Week start is required") LocalDate weekStart,
        Long projectId,
        @Size(max = 50, message = "A weekly report cannot hold more than 50 tasks")
                List<@Valid TaskRequest> tasks,
        @Size(max = 2000) String nextWeekPlan,
        @Size(max = 30) List<@Valid BlockerRequest> blockers,
        @Size(max = 30) List<@Valid AchievementRequest> achievements,
        @Size(max = 10) List<@Valid HoursRequest> hours,
        @Size(max = 2000) String notes,
        @Size(max = 2000) String links) {}
