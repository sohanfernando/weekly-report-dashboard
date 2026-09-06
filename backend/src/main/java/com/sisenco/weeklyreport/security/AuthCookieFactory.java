package com.sisenco.weeklyreport.security;

import com.sisenco.weeklyreport.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Builds the session cookie.
 *
 * <p>httpOnly is the point of the whole design: script on the page cannot read
 * the token, so an XSS bug cannot walk off with a valid session the way it could
 * with a token kept in localStorage.
 */
@Component
@RequiredArgsConstructor
public class AuthCookieFactory {

    private final AppProperties properties;

    public ResponseCookie issue(String token) {
        return build(token, properties.jwt().expirationMinutes() * 60);
    }

    /** An immediately-expiring cookie of the same name, which clears the session. */
    public ResponseCookie clear() {
        return build("", 0);
    }

    private ResponseCookie build(String value, long maxAgeSeconds) {
        return ResponseCookie.from(properties.jwt().cookieName(), value)
                .httpOnly(true)
                .secure(properties.jwt().secureCookie())
                .sameSite(properties.jwt().sameSite())
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
    }
}
