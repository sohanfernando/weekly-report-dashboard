package com.sisenco.weeklyreport.dto.request;

import com.sisenco.weeklyreport.domain.TaskType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Hours in one task-type bucket. Optional per Section 2; drives the time-split chart. */
public record HoursRequest(
        @NotNull(message = "Task type is required") TaskType taskType,
        @NotNull(message = "Hours are required")
                @DecimalMin(value = "0.0", message = "Hours cannot be negative")
                @DecimalMax(value = "999.99", message = "Hours look unrealistic")
                BigDecimal hours) {}
