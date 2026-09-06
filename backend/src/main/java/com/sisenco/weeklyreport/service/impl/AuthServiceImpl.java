package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.dto.request.LoginRequest;
import com.sisenco.weeklyreport.dto.request.RegisterRequest;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.exception.ConflictException;
import com.sisenco.weeklyreport.exception.NotFoundException;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.security.JwtService;
import com.sisenco.weeklyreport.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        // Normalised once here so lookups, uniqueness and login all agree on
        // what "the same email" means.
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with that email already exists");
        }

        User user = User.builder()
                .name(request.name().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.MEMBER)
                .jobTitle(request.jobTitle())
                .active(true)
                .build();

        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Delegating to the {@link AuthenticationManager} rather than comparing
     * hashes by hand keeps the constant-time comparison, the "account disabled"
     * check and the uniform failure message in Spring Security's hands.
     */
    @Override
    @Transactional(readOnly = true)
    public AuthResult login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim(), request.password()));

        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();

        // Re-read the row so the response carries the full profile rather than
        // just the handful of fields the principal keeps.
        User user = userRepository
                .findById(principal.getId())
                .orElseThrow(() -> new ConflictException("Account is no longer available"));

        return new AuthResult(jwtService.issue(principal), UserResponse.from(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse currentUser(Long userId) {
        return userRepository
                .findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> NotFoundException.of("User", userId));
    }
}
