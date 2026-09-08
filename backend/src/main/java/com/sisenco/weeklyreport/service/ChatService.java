package com.sisenco.weeklyreport.service;

import com.sisenco.weeklyreport.dto.request.ChatRequest;
import com.sisenco.weeklyreport.dto.response.ChatResponse;
import com.sisenco.weeklyreport.security.AppUserPrincipal;

/**
 * The AI chat assistant (Section 8, "good to have").
 *
 * <h2>Tool use, not retrieval</h2>
 *
 * The data here is small, structured and already behind a filtered API, so the
 * assistant is given the existing dashboard queries as callable tools rather
 * than an index of embedded report text. "What did design work on last week?" is
 * a filter, not a similarity search, and a retrieval layer would be both more
 * moving parts and a worse answer.
 *
 * <h2>It cannot see more than the person asking</h2>
 *
 * The assistant is manager-only, and every tool runs through the same service
 * methods the REST API uses, as the manager who asked. It is a new interface
 * over authorised queries, not a new path to the data — so drafts stay private
 * and no member can read the team's reports by asking a chatbot instead.
 *
 * @see com.sisenco.weeklyreport.service.impl.ChatServiceImpl
 * @see com.sisenco.weeklyreport.ai.ChatTools
 */
public interface ChatService {

    /**
     * Whether the assistant is configured. False when no API key is present, in
     * which case the feature switches itself off rather than failing: it is
     * optional, and the rest of the application must run without it.
     */
    boolean available();

    /**
     * Answers one question, calling tools as needed.
     *
     * @param caller the manager asking; every tool call runs as them
     * @throws com.sisenco.weeklyreport.exception.ServiceUnavailableException if
     *     the assistant is not configured, or the provider fails
     */
    ChatResponse ask(ChatRequest request, AppUserPrincipal caller);
}
