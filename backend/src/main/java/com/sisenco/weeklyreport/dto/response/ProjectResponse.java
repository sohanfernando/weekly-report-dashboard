package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.Project;
import java.time.Instant;
import java.util.List;

public record ProjectResponse(
        Long id,
        String name,
        String code,
        String description,
        String color,
        boolean active,
        List<UserResponse> members,
        Instant createdAt) {

    /** Without members, for list views where the join would be wasted work. */
    public static ProjectResponse summary(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getCode(),
                project.getDescription(),
                project.getColor(),
                project.isActive(),
                null,
                project.getCreatedAt());
    }

    /** With members. Only call inside a transaction, the collection is lazy. */
    public static ProjectResponse detail(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getCode(),
                project.getDescription(),
                project.getColor(),
                project.isActive(),
                project.getMembers().stream().map(UserResponse::from).toList(),
                project.getCreatedAt());
    }
}
