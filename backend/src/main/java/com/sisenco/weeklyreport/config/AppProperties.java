package com.sisenco.weeklyreport.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application settings bound from the {@code app.*} block of application.yaml.
 * Every value is overridable by environment variable for deployment.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Cors cors, Seed seed, Bootstrap bootstrap, Ai ai) {

    public record Jwt(
            /** HMAC-SHA256 signing key. Must be at least 32 bytes. */
            String secret,
            long expirationMinutes,
            /** Name of the httpOnly cookie the token is carried in. */
            String cookieName,
            /**
             * Marks the cookie Secure. False for plain-HTTP local development;
             * must be true once deployed, and is required by browsers whenever
             * sameSite is None.
             */
            boolean secureCookie,
            /**
             * Lax locally, where the frontend and API share localhost. Must be
             * None in production, where they sit on different domains.
             */
            String sameSite) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Seed(boolean enabled) {}

    public record Bootstrap(Manager manager) {

        /**
         * The first manager, created at startup only when no manager exists yet.
         * Without it there would be no way to grant anyone the MANAGER role,
         * because doing so already requires being a manager.
         */
        public record Manager(boolean enabled, String name, String email, String password) {}
    }

    /**
     * The AI chat assistant (Section 8), served by any OpenAI-compatible
     * endpoint. Groq by default.
     *
     * @param apiKey blank in a checkout that has no key, which switches the
     *     feature off rather than failing at startup — the assistant is optional
     *     and the rest of the application must run without it
     * @param maxToolTurns how many times the model may call tools before it has
     *     to answer. Bounded so a model that keeps asking for data cannot spend
     *     the rate limit on a single question.
     * @param maxHistoryMessages how much of the transcript the client may replay.
     *     The conversation is not stored server-side, so this is the only thing
     *     bounding how large a request can grow.
     */
    public record Ai(
            boolean enabled,
            String apiKey,
            String baseUrl,
            String model,
            int maxToolTurns,
            int maxHistoryMessages,
            int timeoutSeconds) {

        /** Configured <em>and</em> holding a key. Checked before every call. */
        public boolean usable() {
            return enabled && apiKey != null && !apiKey.isBlank();
        }
    }
}
