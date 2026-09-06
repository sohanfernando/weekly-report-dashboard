package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A blocker or challenge.
 *
 * @param key flags this as <em>the</em> key issue of the week. At most one
 *     blocker per report may set it; the service rejects a second.
 */
public record BlockerRequest(
        @NotBlank(message = "Blocker description is required") @Size(max = 1000) String description,
        boolean key,
        boolean resolved) {}
