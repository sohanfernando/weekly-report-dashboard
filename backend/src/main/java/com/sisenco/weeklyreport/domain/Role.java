package com.sisenco.weeklyreport.domain;

/**
 * The two roles in the system. Spring Security sees these as {@code ROLE_MEMBER}
 * and {@code ROLE_MANAGER}.
 *
 * <p>The brief defines exactly two: "Team Member" and "Manager / Admin". Manager
 * and admin are one role, not two — a manager reviews reports and also manages
 * team members and projects.
 */
public enum Role {

    /** Creates, edits and submits their own weekly reports, and sees only those. */
    MEMBER,

    /**
     * Sees and reviews every member's reports, and administers users and
     * projects. Cannot edit the content of anyone else's report.
     */
    MANAGER;

    /** True for roles allowed to see and review the whole team's reports. */
    public boolean canReviewReports() {
        return this == MANAGER;
    }

    /** True for roles allowed to manage users and projects. */
    public boolean canAdminister() {
        return this == MANAGER;
    }

    public String authority() {
        return "ROLE_" + name();
    }
}
