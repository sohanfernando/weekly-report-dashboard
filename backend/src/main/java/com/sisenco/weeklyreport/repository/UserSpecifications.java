package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/** Composable filters for the admin user list. Null arguments mean "no filter". */
public final class UserSpecifications {

    private UserSpecifications() {}

    public static Specification<User> hasRole(Role role) {
        return role == null ? null : (root, q, cb) -> cb.equal(root.get("role"), role);
    }

    public static Specification<User> isActive(Boolean active) {
        return active == null ? null : (root, q, cb) -> cb.equal(root.get("active"), active);
    }

    /** Case-insensitive contains across name and email. */
    public static Specification<User> matches(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String pattern = "%" + search.trim().toLowerCase() + "%";
        return (root, q, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern), cb.like(cb.lower(root.get("email")), pattern));
    }

    @SafeVarargs
    public static Specification<User> combine(Specification<User>... specs) {
        List<Specification<User>> present = new ArrayList<>();
        for (Specification<User> spec : specs) {
            if (spec != null) {
                present.add(spec);
            }
        }
        return Specification.allOf(present);
    }
}
