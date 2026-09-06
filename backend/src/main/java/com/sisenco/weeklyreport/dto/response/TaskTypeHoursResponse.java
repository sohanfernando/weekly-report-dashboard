package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.TaskType;
import java.math.BigDecimal;

/** Team-wide hours in one task-type bucket. */
public record TaskTypeHoursResponse(TaskType taskType, BigDecimal hours) {}
