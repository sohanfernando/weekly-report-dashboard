package com.sisenco.weeklyreport.security;

import com.sisenco.weeklyreport.config.AppProperties;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates a request from the JWT carried in an httpOnly cookie.
 *
 * <p>The user is re-loaded from the database on each request rather than
 * reconstructed from claims alone. That costs one primary-key lookup, and buys
 * immediate revocation: deactivating an account locks it out at once instead of
 * whenever their token happens to expire.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AppProperties properties;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            extractToken(request)
                    .flatMap(jwtService::verify)
                    .flatMap(this::loadActiveUser)
                    .ifPresent(principal -> authenticate(principal, request));
        }
        filterChain.doFilter(request, response);
    }

    private Optional<AppUserPrincipal> loadActiveUser(Claims claims) {
        Long userId;
        try {
            userId = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
        return userRepository.findById(userId).filter(User::isActive).map(AppUserPrincipal::new);
    }

    private void authenticate(AppUserPrincipal principal, HttpServletRequest request) {
        var authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /**
     * Cookie first, then {@code Authorization: Bearer}. The browser client only
     * ever uses the cookie; the header fallback keeps the API usable from curl,
     * Postman and the integration tests without a cookie jar.
     */
    private Optional<String> extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            Optional<String> fromCookie = Arrays.stream(cookies)
                    .filter(c -> properties.jwt().cookieName().equals(c.getName()))
                    .map(Cookie::getValue)
                    .filter(v -> !v.isBlank())
                    .findFirst();
            if (fromCookie.isPresent()) {
                return fromCookie;
            }
        }
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return Optional.of(header.substring(BEARER_PREFIX.length()));
        }
        return Optional.empty();
    }
}
