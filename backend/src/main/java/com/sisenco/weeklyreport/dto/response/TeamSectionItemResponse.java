package com.sisenco.weeklyreport.dto.response;

import java.util.List;

/**
 * One member's entries for a single section of their report, so a manager can
 * read one section across the whole team side by side instead of opening every
 * report in turn (Section 4, "good to have").
 */
public record TeamSectionItemResponse(
        Long userId, String userName, Long reportId, List<Entry> entries) {

    /**
     * @param key whether the member flagged this as the key item of the week
     * @param resolved only meaningful for blockers; always false for achievements
     */
    public record Entry(String description, boolean key, boolean resolved) {}
}
