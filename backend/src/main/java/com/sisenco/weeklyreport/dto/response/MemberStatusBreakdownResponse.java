package com.sisenco.weeklyreport.dto.response;

/** Report outcomes per member over a date range, for the stacked status bar. */
public record MemberStatusBreakdownResponse(
        Long userId, String userName, long submitted, long needsCorrection, long approved, long total) {}
