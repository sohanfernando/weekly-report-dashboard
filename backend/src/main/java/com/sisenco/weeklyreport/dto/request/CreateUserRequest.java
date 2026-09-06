package com.sisenco.weeklyreport.dto.request;

import com.sisenco.weeklyreport.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Admin-only user creation.
 *
 * <p>Unlike {@link RegisterRequest} this one does carry a role, because the
 * caller has already been proven to be an admin by the time it is bound.
 */
public record CreateUserRequest(
        @NotBlank(message = "Name is required") @Size(max = 120) String name,
        @NotBlank(message = "Email is required") @Email(message = "Must be a valid email") @Size(max = 180)
                String email,
        @NotBlank(message = "Password is required")
                @Size(min = 8, max = 72, message = "Password must be at least 8 characters")
                String password,
        @NotNull(message = "Role is required") Role role,
        @Size(max = 120) String jobTitle) {}
