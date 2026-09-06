package com.sisenco.weeklyreport.domain;

/**
 * Application roles. Spring Security sees these as {@code ROLE_MEMBER} etc.
 *
 * <p>ADMIN is a superset of MANAGER: anything a manager can do on the review
 * and dashboard side, an admin can do too, plus user management.
 */
public enum Role {
    MEMBER,
    MANAGER,
    ADMIN;

    /** True for roles allowed to see and review the whole team's reports. */
    public boolean canReviewReports() {
        return this == MANAGER || this == ADMIN;
    }

    public String authority() {
        return "ROLE_" + name();
    }
}
