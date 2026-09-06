package com.sisenco.weeklyreport.domain;

/**
 * A team member's position for one week, as the dashboard reports it.
 *
 * <p>This is {@link ReportStatus} plus the case the status enum cannot express:
 * a member who has not created a report at all. That state is the <em>absence</em>
 * of a row rather than a value in one, so it is derived by comparing the active
 * members against the reports that exist for the week.
 */
public enum SubmissionState {
    NOT_STARTED,
    DRAFT,
    SUBMITTED,
    NEEDS_CORRECTION,
    APPROVED;

    public static SubmissionState from(ReportStatus status) {
        return status == null ? NOT_STARTED : valueOf(status.name());
    }

    /** True once the member has actually sent the report for review at least once. */
    public boolean countsAsSubmitted() {
        return this == SUBMITTED || this == NEEDS_CORRECTION || this == APPROVED;
    }
}
