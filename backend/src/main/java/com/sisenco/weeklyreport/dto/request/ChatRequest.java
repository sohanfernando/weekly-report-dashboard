package com.sisenco.weeklyreport.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * One question to the assistant, with the conversation it belongs to.
 *
 * <p>The transcript is sent by the client rather than stored. A chat is
 * throwaway, so persisting it would mean a table, a migration and a retention
 * question in exchange for nothing the brief asks for. The cost of that choice
 * is that the request grows with the conversation, which is why history is
 * capped both here and again in the service.
 *
 * @param history earlier turns, oldest first, excluding the current message
 */
public record ChatRequest(
        @NotBlank(message = "Ask a question") @Size(max = 1000, message = "Keep the question under 1000 characters")
                String message,
        List<@Valid Turn> history) {

    /** One earlier turn of the conversation. */
    public record Turn(
            @NotNull(message = "Each turn needs a role") Role role,
            @NotBlank @Size(max = 8000) String content) {}

    /**
     * Only the two roles a client may replay. Tool results and system messages
     * are assembled server-side and are deliberately not accepted from the
     * browser — otherwise a caller could forge a tool result and have the model
     * repeat data it never actually read.
     */
    public enum Role {
        USER,
        ASSISTANT
    }
}
