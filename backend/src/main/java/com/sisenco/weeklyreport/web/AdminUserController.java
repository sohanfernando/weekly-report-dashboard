package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.dto.request.CreateUserRequest;
import com.sisenco.weeklyreport.dto.request.UpdateUserRoleRequest;
import com.sisenco.weeklyreport.dto.request.UpdateUserStatusRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * User management, backing the admin page in Section 7 of the brief.
 *
 * <p>Guarded twice on purpose: the {@code /api/admin/**} pattern is already
 * restricted to ADMIN in {@code SecurityConfig}, and {@link PreAuthorize} on the
 * class repeats it. The duplication is deliberate — if someone later re-arranges
 * the URL matchers, these endpoints do not quietly fall open.
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public PageResponse<UserResponse> list(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return userService.list(role, active, search, pageable);
    }

    @GetMapping("/{userId}")
    public UserResponse get(@PathVariable Long userId) {
        return userService.get(userId);
    }

    /** Creates a member, manager or admin directly, bypassing self-registration. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PatchMapping("/{userId}/role")
    public UserResponse updateRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        return userService.updateRole(userId, request, principal.getId());
    }

    @PatchMapping("/{userId}/status")
    public UserResponse updateStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        return userService.updateStatus(userId, request, principal.getId());
    }

    /** Deactivates rather than deletes, so report history survives. */
    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long userId, @AuthenticationPrincipal AppUserPrincipal principal) {
        userService.remove(userId, principal.getId());
    }
}
