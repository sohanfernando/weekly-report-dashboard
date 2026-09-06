package com.sisenco.weeklyreport.dto;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import java.time.Instant;

/**
 * The public shape of a user. Note the absence of {@code passwordHash}: entities
 * are never serialised directly, so a hash cannot leak through a response by
 * accident.
 */
public record UserResponse(
        Long id, String name, String email, Role role, String jobTitle, boolean active, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getJobTitle(),
                user.isActive(),
                user.getCreatedAt());
    }
}
