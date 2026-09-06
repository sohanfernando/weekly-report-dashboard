package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.Set;

/**
 * Section 5, optional: assign team members to a project.
 *
 * <p>The full membership set is sent each time rather than add/remove deltas,
 * so the request is idempotent and two managers editing the same project cannot
 * interleave into a half-applied state.
 */
public record AssignProjectMembersRequest(@NotNull(message = "User ids are required") Set<Long> userIds) {}
