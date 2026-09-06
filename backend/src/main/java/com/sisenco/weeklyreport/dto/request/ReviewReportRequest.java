package com.sisenco.weeklyreport.dto.request;

import com.sisenco.weeklyreport.domain.ReviewAction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A manager's review decision (Section 3).
 *
 * <p>Note what is absent: no report content. A manager may change only the
 * status and leave a comment, never rewrite the member's own words.
 *
 * @param comment mandatory for {@link ReviewAction#REQUEST_CHANGES} — sending a
 *     report back without saying why is the one thing that makes the correction
 *     cycle useless. Optional on approval. Enforced in the service, since the
 *     requirement depends on the value of another field.
 */
public record ReviewReportRequest(
        @NotNull(message = "Action is required") ReviewAction action,
        @Size(max = 2000, message = "Comment cannot exceed 2000 characters") String comment) {}
