package com.sisenco.weeklyreport.domain;

/**
 * The review lifecycle of a weekly report.
 *
 * <pre>
 *   DRAFT ──submit──▶ SUBMITTED ──approve────────▶ APPROVED
 *     ▲                   │
 *     │                   └──request changes──▶ NEEDS_CORRECTION
 *     │                                              │
 *     └──────────────(same report, new version)──────┘
 *                         resubmit ▶ SUBMITTED
 * </pre>
 */
public enum ReportStatus {
    /** Owner is still filling it in. Visible only to them. */
    DRAFT,
    /** Awaiting manager review. Appears on the manager dashboard. */
    SUBMITTED,
    /** Manager sent it back with a comment. Editable by the owner again. */
    NEEDS_CORRECTION,
    /** Manager is satisfied. Terminal state, no further edits. */
    APPROVED;

    /** True while the owner is still allowed to change report content. */
    public boolean isEditableByOwner() {
        return this == DRAFT || this == NEEDS_CORRECTION;
    }

    /** True when a manager may take an approve / request-changes action. */
    public boolean isAwaitingReview() {
        return this == SUBMITTED;
    }
}
