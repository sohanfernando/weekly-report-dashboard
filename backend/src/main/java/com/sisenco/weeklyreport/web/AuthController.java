package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.dto.request.ChangePasswordRequest;
import com.sisenco.weeklyreport.dto.request.LoginRequest;
import com.sisenco.weeklyreport.dto.request.RegisterRequest;
import com.sisenco.weeklyreport.dto.request.UpdateProfileRequest;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.security.AuthCookieFactory;
import com.sisenco.weeklyreport.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registration, login, logout and "who am I".
 *
 * <p>The token is never returned in the body — it is written straight into an
 * httpOnly cookie, so the browser sends it automatically and page scripts can
 * never read it.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieFactory cookieFactory;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.issue(result.token()).toString())
                .body(result.user());
    }

    /**
     * Clears the cookie. Nothing to invalidate server-side: the token is
     * stateless, which is the trade-off that comes with not keeping sessions.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clear().toString())
                .build();
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return authService.currentUser(principal.getId());
    }

    /** Edits the caller's own profile. Never anybody else's — the id comes from the session. */
    @PatchMapping("/me")
    public UserResponse updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        return authService.updateProfile(principal.getId(), request);
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        authService.changePassword(principal.getId(), request);
    }
}
