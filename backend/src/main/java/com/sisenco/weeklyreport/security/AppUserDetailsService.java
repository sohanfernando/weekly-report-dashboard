package com.sisenco.weeklyreport.security;

import com.sisenco.weeklyreport.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Loads users for form login. Email is the username. */
@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AppUserPrincipal loadUserByUsername(String email) {
        return userRepository
                .findByEmailIgnoreCase(email)
                .map(AppUserPrincipal::new)
                // Deliberately vague: distinguishing "no such user" from "wrong
                // password" would let an attacker enumerate valid accounts.
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
    }
}
