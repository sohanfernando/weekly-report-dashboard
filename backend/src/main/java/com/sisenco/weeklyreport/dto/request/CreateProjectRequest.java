package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Section 5: add a project or work category, e.g. "Client A", "Internal Tooling". */
public record CreateProjectRequest(
        @NotBlank(message = "Name is required") @Size(max = 120) String name,
        @NotBlank(message = "Code is required")
                @Size(max = 30)
                @Pattern(
                        regexp = "^[A-Za-z0-9][A-Za-z0-9-_]*$",
                        message = "Code may only contain letters, digits, hyphens and underscores")
                String code,
        @Size(max = 500) String description,
        @Pattern(regexp = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", message = "Colour must be a hex value like #4F46E5")
                String color) {}
