package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByActiveTrueOrderByNameAsc();

    /**
     * Active users in a given role. Used to work out who was expected to submit
     * a report for a week, which is how "not yet started" is derived.
     */
    List<User> findByRoleAndActiveTrueOrderByNameAsc(Role role);

    long countByRoleAndActiveTrue(Role role);
}
