package com.sisenco.weeklyreport.dto.request;

import com.sisenco.weeklyreport.domain.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(@NotNull(message = "Role is required") Role role) {}
