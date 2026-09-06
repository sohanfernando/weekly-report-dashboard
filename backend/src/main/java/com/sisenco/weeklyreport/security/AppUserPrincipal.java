package com.sisenco.weeklyreport.security;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * The authenticated caller.
 *
 * <p>Carries the user id as well as the username, because almost every
 * authorization check in this application is an ownership check — "is this
 * report yours?" — and doing that by id avoids a lookup on every request.
 */
@Getter
public class AppUserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String name;
    private final Role role;
    private final transient String passwordHash;
    private final boolean active;

    public AppUserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.role = user.getRole();
        this.passwordHash = user.getPasswordHash();
        this.active = user.isActive();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.authority()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    @Override
    public boolean isAccountNonExpired() {
        return active;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return active;
    }

    public boolean canReviewReports() {
        return role != null && role.canReviewReports();
    }
}
