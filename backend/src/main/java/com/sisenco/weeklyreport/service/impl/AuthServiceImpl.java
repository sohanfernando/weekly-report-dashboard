package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.dto.request.ChangePasswordRequest;
import com.sisenco.weeklyreport.dto.request.LoginRequest;
import com.sisenco.weeklyreport.dto.request.RegisterRequest;
import com.sisenco.weeklyreport.dto.request.UpdateProfileRequest;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.exception.BadRequestException;
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
                .role(request.roleOrDefault())
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

    @Override
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> NotFoundException.of("User", userId));
        user.setName(request.name().trim());
        user.setJobTitle(request.jobTitle() == null || request.jobTitle().isBlank()
                ? null
                : request.jobTitle().trim());
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> NotFoundException.of("User", userId));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Your current password is not correct");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("The new password must be different from the current one");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
