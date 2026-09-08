package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.dto.request.ChatRequest;
import com.sisenco.weeklyreport.dto.response.ChatResponse;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.ChatService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The AI chat assistant (Section 8).
 *
 * <p>Mapped under {@code /api/manager} so it inherits the manager-only matcher
 * in {@link com.sisenco.weeklyreport.config.SecurityConfig}; the class-level
 * {@code @PreAuthorize} states the same rule where a reader of this file will
 * see it. The brief scopes the assistant to managers, and that is enforced here
 * rather than by hiding the widget in the frontend.
 */
@RestController
@RequestMapping("/api/manager/chat")
@PreAuthorize("hasRole('MANAGER')")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * Whether the assistant is configured on this deployment, so the frontend
     * can hide the widget rather than offer a feature that will answer 503.
     */
    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("available", chatService.available());
    }

    /** Asks one question. The client supplies the conversation so far. */
    @PostMapping
    public ChatResponse ask(
            @Valid @RequestBody ChatRequest request, @AuthenticationPrincipal AppUserPrincipal principal) {
        return chatService.ask(request, principal);
    }
}
