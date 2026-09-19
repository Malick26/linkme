package com.linkme.api.auth;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Principal stocké en session (sérialisable, sans donnée sensible hormis le hash utilisé à l'authentification). */
public record AppUser(UUID id, String email, String passwordHash) implements UserDetails {
    private static final long serialVersionUID = 1L;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_CREATOR"));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    /** Le hash n'a pas à survivre en session. */
    public AppUser withoutSecret() {
        return new AppUser(id, email, null);
    }
}
