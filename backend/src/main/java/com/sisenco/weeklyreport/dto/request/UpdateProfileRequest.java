package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service profile edit.
 *
 * <p>Deliberately excludes email and role: changing an email would move the
 * login identity, and granting yourself a role is exactly what the access rules
 * exist to prevent.
 */
public record UpdateProfileRequest(
        @NotBlank(message = "Name is required") @Size(max = 120) String name,
        @Size(max = 120) String jobTitle) {}
