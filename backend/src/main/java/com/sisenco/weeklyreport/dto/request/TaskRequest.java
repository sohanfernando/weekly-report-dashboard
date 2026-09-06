package com.sisenco.weeklyreport.dto.request;

import com.sisenco.weeklyreport.domain.TaskPriority;
import com.sisenco.weeklyreport.domain.TaskStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** One row of the task-level table required by Section 2. */
public record TaskRequest(
        @NotBlank(message = "Task name is required") @Size(max = 255) String name,
        @NotNull(message = "Priority is required") TaskPriority priority,
        @Min(value = 0, message = "Planned % must be between 0 and 100")
                @Max(value = 100, message = "Planned % must be between 0 and 100")
                int plannedPct,
        @Min(value = 0, message = "Actual % must be between 0 and 100")
                @Max(value = 100, message = "Actual % must be between 0 and 100")
                int actualPct,
        @NotNull(message = "Status is required") TaskStatus status,
        @NotNull(message = "Planned hours are required")
                @DecimalMin(value = "0.0", message = "Planned hours cannot be negative")
                @DecimalMax(value = "999.99", message = "Planned hours look unrealistic")
                BigDecimal hoursPlanned,
        @NotNull(message = "Time spent is required")
                @DecimalMin(value = "0.0", message = "Time spent cannot be negative")
                @DecimalMax(value = "999.99", message = "Time spent looks unrealistic")
                BigDecimal hoursSpent,
        @Size(max = 500) String deliverable) {}
