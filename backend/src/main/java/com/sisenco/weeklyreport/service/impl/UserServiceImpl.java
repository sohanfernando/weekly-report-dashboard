package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.dto.request.CreateUserRequest;
import com.sisenco.weeklyreport.dto.request.UpdateUserRoleRequest;
import com.sisenco.weeklyreport.dto.request.UpdateUserStatusRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.exception.ConflictException;
import com.sisenco.weeklyreport.exception.NotFoundException;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.repository.UserSpecifications;
import com.sisenco.weeklyreport.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(Role role, Boolean active, String search, Pageable pageable) {
        var spec = UserSpecifications.combine(
                UserSpecifications.hasRole(role),
                UserSpecifications.isActive(active),
                UserSpecifications.matches(search));
        return PageResponse.from(userRepository.findAll(spec, pageable), UserResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse get(Long userId) {
        return UserResponse.from(findUser(userId));
    }

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with that email already exists");
        }

        User user = User.builder()
                .name(request.name().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role())
                .jobTitle(request.jobTitle())
                .active(true)
                .build();

        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateRole(Long userId, UpdateUserRoleRequest request, Long actingAdminId) {
        User user = findUser(userId);

        if (user.getRole() == request.role()) {
            return UserResponse.from(user);
        }
        if (userId.equals(actingAdminId)) {
            throw new ConflictException("You cannot change your own role");
        }
        if (user.getRole() == Role.ADMIN) {
            requireAnotherAdminRemains(user);
        }

        user.setRole(request.role());
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateStatus(Long userId, UpdateUserStatusRequest request, Long actingAdminId) {
        User user = findUser(userId);
        boolean active = Boolean.TRUE.equals(request.active());

        if (user.isActive() == active) {
            return UserResponse.from(user);
        }
        if (!active) {
            requireNotSelf(userId, actingAdminId, "deactivate your own account");
            if (user.getRole() == Role.ADMIN) {
                requireAnotherAdminRemains(user);
            }
        }

        user.setActive(active);
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    @Transactional
    public void remove(Long userId, Long actingAdminId) {
        User user = findUser(userId);
        requireNotSelf(userId, actingAdminId, "remove your own account");

        if (user.getRole() == Role.ADMIN) {
            requireAnotherAdminRemains(user);
        }
        if (!user.isActive()) {
            return;
        }

        user.setActive(false);
        userRepository.save(user);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> NotFoundException.of("User", userId));
    }

    private void requireNotSelf(Long userId, Long actingAdminId, String action) {
        if (userId.equals(actingAdminId)) {
            throw new ConflictException("You cannot " + action);
        }
    }

    /**
     * Refuses the change if it would leave the system with no active admin.
     *
     * <p>The subject is only counted when they are currently active, so
     * deactivating an already-inactive admin cannot trip the check.
     */
    private void requireAnotherAdminRemains(User subject) {
        long activeAdmins = userRepository.countByRoleAndActiveTrue(Role.ADMIN);
        long remaining = subject.isActive() ? activeAdmins - 1 : activeAdmins;
        if (remaining < 1) {
            throw new ConflictException("The last active administrator cannot be demoted or removed");
        }
    }
}
