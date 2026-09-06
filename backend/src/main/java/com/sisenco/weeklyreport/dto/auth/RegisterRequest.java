package com.sisenco.weeklyreport.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service signup. Deliberately has no role field: everyone registers as a
 * MEMBER and only an admin can promote them, otherwise anyone could grant
 * themselves manager access to the whole team's reports.
 */
public record RegisterRequest(
        @NotBlank(message = "Name is required") @Size(max = 120) String name,
        @NotBlank(message = "Email is required") @Email(message = "Must be a valid email") @Size(max = 180)
                String email,
        @NotBlank(message = "Password is required")
                @Size(min = 8, max = 72, message = "Password must be at least 8 characters")
                String password,
        @Size(max = 120) String jobTitle) {}
