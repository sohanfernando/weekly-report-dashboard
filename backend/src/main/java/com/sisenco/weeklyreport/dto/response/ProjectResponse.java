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
        /** Null in list responses, where the full objects would be wasted work. */
        List<UserResponse> members,
        /** Always populated, so the list view can show membership without the objects. */
        int memberCount,
        Instant createdAt) {

    /**
     * Without the member objects, for list views.
     *
     * <p>Only safe to call on a project whose membership is loaded — the count
     * touches the collection. The repository's fetch-join queries are what
     * guarantee that.
     */
    public static ProjectResponse summary(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getCode(),
                project.getDescription(),
                project.getColor(),
                project.isActive(),
                null,
                project.getMembers().size(),
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
                project.getMembers().size(),
                project.getCreatedAt());
    }
}
