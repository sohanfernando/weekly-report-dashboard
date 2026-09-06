package com.sisenco.weeklyreport.dto.response;

import java.time.LocalDate;

/** One point on the "tasks completed over time" line. */
public record WeeklyTrendPointResponse(
        LocalDate weekStart, long reportCount, long completedTasks, long totalTasks) {}
