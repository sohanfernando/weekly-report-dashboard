package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * An achievement or highlight.
 *
 * @param key flags this as <em>the</em> key achievement of the week. At most one
 *     achievement per report may set it.
 */
public record AchievementRequest(
        @NotBlank(message = "Achievement description is required") @Size(max = 1000) String description,
        boolean key) {}
