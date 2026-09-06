package com.sisenco.weeklyreport.service;

import com.sisenco.weeklyreport.dto.request.LoginRequest;
import com.sisenco.weeklyreport.dto.request.RegisterRequest;
import com.sisenco.weeklyreport.dto.response.UserResponse;

/**
 * Registration, login and identity lookup.
 *
 * <p>Controllers depend on this interface rather than the implementation, which
 * keeps the web layer testable with a stub and leaves room for a second
 * implementation later without touching a controller.
 *
 * @see com.sisenco.weeklyreport.service.impl.AuthServiceImpl
 */
public interface AuthService {

    /**
     * Creates a new account.
     *
     * <p>The new user is always a MEMBER; promotion is a separate admin action,
     * so nobody can grant themselves access to the whole team at signup.
     *
     * @throws com.sisenco.weeklyreport.exception.ConflictException if the email is taken
     */
    UserResponse register(RegisterRequest request);

    /**
     * Verifies credentials and mints a session token.
     *
     * @throws org.springframework.security.authentication.BadCredentialsException
     *     if the email is unknown or the password is wrong — deliberately the
     *     same failure either way, so the endpoint cannot enumerate accounts
     */
    AuthResult login(LoginRequest request);

    /** The profile of the currently authenticated caller. */
    UserResponse currentUser(Long userId);

    /** The signed token plus the user it identifies. */
    record AuthResult(String token, UserResponse user) {}
}
