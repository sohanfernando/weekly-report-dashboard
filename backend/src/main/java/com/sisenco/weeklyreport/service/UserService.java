package com.sisenco.weeklyreport.service;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.dto.request.CreateUserRequest;
import com.sisenco.weeklyreport.dto.request.UpdateUserRoleRequest;
import com.sisenco.weeklyreport.dto.request.UpdateUserStatusRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import org.springframework.data.domain.Pageable;

/**
 * Administration of team members: who exists, what role they hold, and whether
 * they can still log in.
 *
 * <p>Two invariants are enforced throughout, because breaking either leaves the
 * system unadministrable:
 *
 * <ul>
 *   <li>An admin cannot demote or deactivate <em>themselves</em>. Otherwise a
 *       single mis-click ends with nobody able to administer anything.
 *   <li>The last remaining active admin cannot be demoted, deactivated or
 *       removed, whoever is asking.
 * </ul>
 *
 * @see com.sisenco.weeklyreport.service.impl.UserServiceImpl
 */
public interface UserService {

    /** Paginated user list. Every filter is optional. */
    PageResponse<UserResponse> list(Role role, Boolean active, String search, Pageable pageable);

    UserResponse get(Long userId);

    /** Creates a user directly, with a role, on behalf of an admin. */
    UserResponse create(CreateUserRequest request);

    UserResponse updateRole(Long userId, UpdateUserRoleRequest request, Long actingAdminId);

    UserResponse updateStatus(Long userId, UpdateUserStatusRequest request, Long actingAdminId);

    /**
     * Removes a team member.
     *
     * <p>Implemented as deactivation rather than a row delete: reports reference
     * their author, and a weekly report whose owner has vanished is worse than
     * useless on a manager's dashboard. A deactivated user cannot log in and
     * their history stays intact.
     */
    void remove(Long userId, Long actingAdminId);
}
