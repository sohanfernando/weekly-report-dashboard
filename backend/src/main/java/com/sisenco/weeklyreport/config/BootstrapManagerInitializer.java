package com.sisenco.weeklyreport.config;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first manager, so the system can be administered at all.
 *
 * <p>Registration deliberately refuses to grant roles, and changing a role is a
 * manager-only action, so a database with no manager in it could never grow one.
 * This runner breaks that cycle exactly once: it does nothing at all if any
 * active manager already exists, so it cannot be used to regain access to a
 * running system or to silently reset a real manager's password.
 */
@Component
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class BootstrapManagerInitializer implements ApplicationRunner {

    private static final String DEFAULT_PASSWORD = "Manager@12345";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Bootstrap.Manager config = properties.bootstrap().manager();
        if (!config.enabled()) {
            return;
        }
        if (userRepository.countByRoleAndActiveTrue(Role.MANAGER) > 0) {
            log.debug("A manager already exists; skipping bootstrap");
            return;
        }

        String email = config.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            log.warn(
                    "Cannot bootstrap manager: {} already exists as a member. "
                            + "Promote it directly in the database, or set BOOTSTRAP_MANAGER_EMAIL to a free address.",
                    email);
            return;
        }

        User manager = User.builder()
                .name(config.name())
                .email(email)
                .passwordHash(passwordEncoder.encode(config.password()))
                .role(Role.MANAGER)
                .jobTitle("Engineering Manager")
                .active(true)
                .build();
        userRepository.save(manager);

        log.info("Created bootstrap manager {}", email);
        if (DEFAULT_PASSWORD.equals(config.password())) {
            log.warn(
                    "Bootstrap manager is using the built-in default password. "
                            + "Set BOOTSTRAP_MANAGER_PASSWORD before exposing this instance to anyone.");
        }
    }
}
