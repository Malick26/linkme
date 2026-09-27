package com.linkme.api.auth;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Règles des handles publics (brief §7.1) : a-z0-9._- , 3–30 caractères, liste réservée (routes du front et marque). */
public final class Handles {
    public static final Pattern FORMAT = Pattern.compile("^[a-z0-9._-]{3,30}$");

    public static final Set<String> RESERVED = Set.of(
            "admin", "administrator", "api", "app", "login", "logout", "register", "signup", "signin", "forgot", "reset",
            "settings", "shop", "help", "support", "legal", "media", "seed", "fonts", "healthz", "static", "assets",
            "www", "about", "blog", "docs", "terms", "privacy", "contact", "dashboard", "account", "home", "index",
            "linkme", "null", "undefined", "commande", "order", "orders", "checkout", "payments", "webhooks", "public",
            "me", "root", "system", "prospects", "unsubscribe", "rejoindre", "desinscription", "moderator", "staff", "security", "status", "favicon.svg", "robots.txt", "sitemap.xml");

    private Handles() {}

    public static String normalize(String handle) {
        return handle == null ? "" : handle.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean validFormat(String h) {
        return FORMAT.matcher(h).matches() && !h.matches("^[._-]+$") && !h.startsWith(".") && !h.endsWith(".");
    }

    public static boolean reserved(String h) {
        return RESERVED.contains(h);
    }
}
