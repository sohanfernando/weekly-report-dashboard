package com.sisenco.weeklyreport.dto.response;

import java.math.BigDecimal;

/** Task and hour distribution for one project. */
public record ProjectWorkloadResponse(
        Long projectId,
        String projectName,
        String projectColor,
        long reportCount,
        long taskCount,
        BigDecimal hoursSpent) {}
