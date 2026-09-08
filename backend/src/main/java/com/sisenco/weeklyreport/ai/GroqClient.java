package com.sisenco.weeklyreport.ai;

import com.sisenco.weeklyreport.config.AppProperties;
import com.sisenco.weeklyreport.exception.ServiceUnavailableException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.json.JsonMapper;

/**
 * A minimal client for an OpenAI-compatible chat-completions endpoint, used here
 * to reach Groq.
 *
 * <p>Three deliberate choices:
 *
 * <ul>
 *   <li><b>The JDK HttpClient rather than RestClient.</b> One call, one shape,
 *       and a request timeout that has to be right — a hung model call must not
 *       hold a servlet thread until the container gives up on it.
 *   <li><b>Requests built as maps, responses read into records.</b> Outgoing
 *       JSON omits a key entirely rather than sending null, which some
 *       OpenAI-compatible servers reject; incoming JSON gets record types and a
 *       snake_case naming strategy, so no field needs an annotation.
 *   <li><b>The wire format stops here.</b> Callers see {@link Reply} and
 *       {@link ToolCall}, never a choices array, so changing provider means
 *       replacing this one class and nothing else.
 * </ul>
 */
@Component
@Slf4j
public class GroqClient {

    /** Low, because this assistant reports figures rather than inventing prose. */
    private static final double TEMPERATURE = 0.2;

    private static final int MAX_TOKENS = 1500;

    private static final JsonMapper MAPPER = JsonMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private final AppProperties.Ai config;
    private final HttpClient http;

    public GroqClient(AppProperties properties) {
        this.config = properties.ai();
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /** Whether the feature is switched on and actually holds a key. */
    public boolean available() {
        return config.usable();
    }

    public String model() {
        return config.model();
    }

    // -------------------------------------------------------------- messages

    public static Map<String, Object> system(String content) {
        return Map.of("role", "system", "content", content);
    }

    public static Map<String, Object> user(String content) {
        return Map.of("role", "user", "content", content);
    }

    /**
     * Replays an assistant turn, including any tool calls it asked for.
     *
     * <p>The calls have to go back exactly as they arrived: the model matches its
     * own call ids against the results that follow, and an id that does not line
     * up is rejected by the endpoint.
     */
    public static Map<String, Object> assistant(Reply reply) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "assistant");
        message.put("content", reply.content() == null ? "" : reply.content());
        if (reply.wantsTools()) {
            message.put(
                    "tool_calls",
                    reply.toolCalls().stream()
                            .map(call -> Map.<String, Object>of(
                                    "id",
                                    call.id(),
                                    "type",
                                    "function",
                                    "function",
                                    Map.of("name", call.name(), "arguments", call.arguments())))
                            .toList());
        }
        return message;
    }

    /** The result of one tool call, addressed to the call that asked for it. */
    public static Map<String, Object> toolResult(String toolCallId, String content) {
        return Map.of("role", "tool", "tool_call_id", toolCallId, "content", content);
    }

    // ------------------------------------------------------------------ call

    /**
     * One round trip. Returns whatever the model produced: prose, tool calls, or
     * both.
     *
     * @throws ServiceUnavailableException on any transport or upstream failure,
     *     so a provider outage surfaces as 503 rather than as a 500 that reads
     *     like a bug in this application
     */
    public Reply complete(List<Map<String, Object>> messages, List<Tool> tools) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", config.model());
        body.put("messages", messages);
        body.put("temperature", TEMPERATURE);
        body.put("max_tokens", MAX_TOKENS);
        if (!tools.isEmpty()) {
            body.put("tools", tools.stream().map(Tool::toWire).toList());
            body.put("tool_choice", "auto");
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(config.baseUrl() + "/chat/completions"))
                .timeout(Duration.ofSeconds(config.timeoutSeconds()))
                .header("Authorization", "Bearer " + config.apiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(body)))
                .build();

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ServiceUnavailableException("The assistant was interrupted. Please try again.");
        } catch (Exception ex) {
            // Never echo the exception outward: it can carry the request URL.
            log.warn("Chat provider unreachable at {}: {}", config.baseUrl(), ex.toString());
            throw new ServiceUnavailableException("The assistant is unreachable. Please try again.");
        }

        if (response.statusCode() / 100 != 2) {
            // The upstream body can quote request content back, so it is logged
            // rather than returned to the caller.
            log.warn("Chat provider returned {}: {}", response.statusCode(), response.body());
            throw new ServiceUnavailableException(
                    response.statusCode() == 429
                            ? "The assistant is rate limited right now. Please try again in a moment."
                            : "The assistant is unavailable. Please try again.");
        }

        Completion completion = MAPPER.readValue(response.body(), Completion.class);
        if (completion.choices() == null || completion.choices().isEmpty()) {
            throw new ServiceUnavailableException("The assistant returned nothing. Please try again.");
        }

        Completion.Message message = completion.choices().get(0).message();
        List<ToolCall> calls = new ArrayList<>();
        if (message.toolCalls() != null) {
            for (Completion.WireToolCall call : message.toolCalls()) {
                if (call.function() != null) {
                    calls.add(new ToolCall(
                            call.id(),
                            call.function().name(),
                            call.function().arguments() == null
                                    ? "{}"
                                    : call.function().arguments()));
                }
            }
        }
        return new Reply(message.content(), List.copyOf(calls));
    }

    // ----------------------------------------------------------------- types

    /**
     * A function the model may call.
     *
     * @param parameters a JSON Schema object describing the arguments
     */
    public record Tool(String name, String description, Map<String, Object> parameters) {

        Map<String, Object> toWire() {
            return Map.of(
                    "type",
                    "function",
                    "function",
                    Map.of("name", name, "description", description, "parameters", parameters));
        }
    }

    /** One request from the model to run a tool. {@code arguments} is raw JSON. */
    public record ToolCall(String id, String name, String arguments) {}

    /** What the model produced. Either half may be empty; both never are. */
    public record Reply(String content, List<ToolCall> toolCalls) {

        public boolean wantsTools() {
            return toolCalls != null && !toolCalls.isEmpty();
        }
    }

    /** The upstream response, mapped only as far as this class needs it. */
    private record Completion(List<Choice> choices) {

        private record Choice(Message message, String finishReason) {}

        private record Message(String role, String content, List<WireToolCall> toolCalls) {}

        private record WireToolCall(String id, String type, WireFunction function) {}

        private record WireFunction(String name, String arguments) {}
    }
}
