package com.sisenco.weeklyreport.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application settings bound from the {@code app.*} block of application.yaml.
 * Every value is overridable by environment variable for deployment.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Cors cors, Seed seed, Bootstrap bootstrap) {

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

    public record Bootstrap(Admin admin) {

        /**
         * The first administrator, created at startup only when no admin exists
         * yet. Without it there would be no way to grant anyone the ADMIN role,
         * because doing so already requires being an admin.
         */
        public record Admin(boolean enabled, String name, String email, String password) {}
    }
}
