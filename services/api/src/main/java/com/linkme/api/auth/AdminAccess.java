package com.linkme.api.auth;

import com.linkme.api.config.AppProperties;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Qui a accès à l'espace admin (D56) : les comptes dont l'email figure dans {@code ADMIN_EMAILS} (liste séparée par
 * des virgules). Pas de rôle en base ni d'écran pour se promouvoir soi-même : la liste vit dans l'environnement du
 * serveur, hors de portée d'une faille applicative. Pris en compte à la connexion suivante.
 */
@Component
public class AdminAccess {
    private final Set<String> emails;

    public AdminAccess(AppProperties props) {
        String raw = props.adminEmails() == null ? "" : props.adminEmails();
        this.emails = Arrays.stream(raw.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isAdmin(String email) {
        return email != null && emails.contains(email.trim().toLowerCase(Locale.ROOT));
    }
}
