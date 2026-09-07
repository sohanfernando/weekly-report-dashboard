package com.sisenco.weeklyreport.dto.request;

import com.sisenco.weeklyreport.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service signup.
 *
 * <p>The brief allows role assignment "by an admin, or at signup", and this
 * application takes the second option: the registration form asks which role
 * you are joining as.
 *
 * <p>Worth being explicit about the consequence, because it is not obvious from
 * the form: anyone who can reach the signup page can choose MANAGER and read
 * every team member's reports. That is acceptable for an internal tool behind a
 * company network or for this assignment, but a public deployment would want
 * an invite code or an approval step in front of it.
 *
 * @param role optional. Omitted means MEMBER — the safer of the two, so a
 *     caller that forgets the field cannot accidentally create a manager.
 */
public record RegisterRequest(
        @NotBlank(message = "Name is required") @Size(max = 120) String name,
        @NotBlank(message = "Email is required") @Email(message = "Must be a valid email") @Size(max = 180)
                String email,
        @NotBlank(message = "Password is required")
                @Size(min = 8, max = 72, message = "Password must be at least 8 characters")
                String password,
        @Size(max = 120) String jobTitle,
        Role role) {

    /** The role to create, defaulting to MEMBER when the caller omits it. */
    public Role roleOrDefault() {
        return role == null ? Role.MEMBER : role;
    }
}
