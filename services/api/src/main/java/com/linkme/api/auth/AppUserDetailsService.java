package com.linkme.api.auth;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {
    private final UserRepository users;
    private final AdminAccess adminAccess;

    public AppUserDetailsService(UserRepository users, AdminAccess adminAccess) {
        this.users = users;
        this.adminAccess = adminAccess;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        return users.findActiveByEmail(email)
                .map(u -> new AppUser(u.getId(), u.getEmail(), u.getPasswordHash(), adminAccess.isAdmin(u.getEmail())))
                .orElseThrow(() -> new UsernameNotFoundException("unknown"));
    }
}
