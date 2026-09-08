package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.ai.ChatTools;
import com.sisenco.weeklyreport.ai.GroqClient;
import com.sisenco.weeklyreport.config.AppProperties;
import com.sisenco.weeklyreport.dto.request.ChatRequest;
import com.sisenco.weeklyreport.dto.response.ChatResponse;
import com.sisenco.weeklyreport.exception.ServiceUnavailableException;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.ChatService;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The tool-calling loop.
 *
 * <p>The model is asked a question, may answer straight away, or may ask for one
 * or more tools to be run first. Each result goes back into the conversation and
 * the model is asked again, until it answers or the turn budget runs out.
 *
 * <p>Read-only at the transaction level as well as by tool design: the whole
 * exchange runs in a read-only transaction, so even a bug in a tool could not
 * write.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final GroqClient groq;
    private final ChatTools tools;
    private final AppProperties properties;

    @Override
    public boolean available() {
        return groq.available();
    }

    @Override
    @Transactional(readOnly = true)
    public ChatResponse ask(ChatRequest request, AppUserPrincipal caller) {
        if (!groq.available()) {
            throw new ServiceUnavailableException(
                    "The assistant is not configured on this deployment. Set GROQ_API_KEY to enable it.");
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(GroqClient.system(systemPrompt()));
        for (ChatRequest.Turn turn : recentHistory(request.history())) {
            messages.add(switch (turn.role()) {
                case USER -> GroqClient.user(turn.content());
                    // Replayed as plain prose: the tool calls behind an earlier
                    // answer are not sent back, because their results are not
                    // either, and a call without its result is rejected.
                case ASSISTANT -> GroqClient.assistant(new GroqClient.Reply(turn.content(), List.of()));
            });
        }
        messages.add(GroqClient.user(request.message()));

        List<String> used = new ArrayList<>();
        int budget = properties.ai().maxToolTurns();

        for (int turn = 0; turn < budget; turn++) {
            GroqClient.Reply reply = groq.complete(messages, tools.definitions());
            if (!reply.wantsTools()) {
                return new ChatResponse(clean(reply.content()), List.copyOf(used), groq.model());
            }

            messages.add(GroqClient.assistant(reply));
            for (GroqClient.ToolCall call : reply.toolCalls()) {
                used.add(call.name());
                messages.add(GroqClient.toolResult(
                        call.id(), tools.run(call.name(), call.arguments(), caller)));
            }
        }

        // Budget spent. Rather than giving up, ask once more with the tools
        // withheld, which forces an answer out of what was already gathered.
        log.info("Chat hit the {}-turn tool budget; answering from what was collected", budget);
        GroqClient.Reply forced = groq.complete(messages, List.of());
        return new ChatResponse(clean(forced.content()), List.copyOf(used), groq.model());
    }

    /**
     * The standing instructions.
     *
     * <p>Three things are injected because the model cannot know them: today's
     * date, so "last week" resolves to a real Monday; the roster, so a partial
     * name maps to a real person without spending a tool call on it; and the
     * status vocabulary, so it does not invent its own.
     */
    private String systemPrompt() {
        LocalDate today = LocalDate.now();
        LocalDate thisWeek = today.with(DayOfWeek.MONDAY);
        List<String> roster = tools.memberNames();

        return """
                You are the reporting analyst built into a weekly report and team dashboard tool. \
                You are speaking to a team manager about their own team.

                Today is %s. The current reporting week begins Monday %s, and last week began \
                Monday %s. Weeks always start on a Monday.

                The active team members are: %s.

                Reports move through DRAFT, SUBMITTED, NEEDS_CORRECTION and APPROVED. A draft is \
                private to whoever wrote it and is never visible to you, so if someone has no \
                report, say they have not submitted one rather than that they have done no work.

                How to answer:
                - Use the tools whenever the answer depends on data. Never guess at one.
                - Use only what the tools return. Never invent a name, number, date, task or blocker.
                - Quote figures exactly as given. Do not round percentages or hours.
                - If a tool comes back empty, say plainly that there is nothing recorded for that week.
                - You can only read. If asked to approve a report, edit one or contact somebody, \
                say that has to be done in the app itself.

                Your answer appears in a narrow chat panel, roughly 400 pixels wide. Write for \
                that space:
                - Never use a table. There is no room for one and it will not render.
                - No markdown headings. Plain sentences, and short "- " bullets when listing things.
                - Bold with **double asterisks** only for a name or a figure worth catching the \
                eye, a few times at most.
                - Stay under about 120 words. Covering the whole team means one short line per \
                person, not a profile of each.
                - Answer what was asked and offer to go deeper, rather than pre-empting every \
                follow-up question.
                - Do not mention the tools or describe your own process.\
                """
                .formatted(
                        today,
                        thisWeek,
                        thisWeek.minusWeeks(1),
                        roster.isEmpty() ? "nobody yet" : String.join(", ", roster));
    }

    /**
     * The tail of the conversation. The client is trusted to send its own
     * transcript, so the cap is applied here rather than believed.
     */
    private List<ChatRequest.Turn> recentHistory(List<ChatRequest.Turn> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }
        int max = properties.ai().maxHistoryMessages();
        return history.size() <= max ? history : history.subList(history.size() - max, history.size());
    }

    /** A model that calls no tool and says nothing still owes the user a reply. */
    private String clean(String content) {
        return content == null || content.isBlank()
                ? "I could not work that one out. Try asking about a specific week or person."
                : content.trim();
    }
}
