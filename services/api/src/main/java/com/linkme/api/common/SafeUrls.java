package com.linkme.api.common;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

/** URLs autorisées (brief §7.3, §10) : https, mailto, tel, wa.me. Tout le reste (javascript:, data:, http:) est refusé. */
public final class SafeUrls {
    private static final Pattern TEL = Pattern.compile("^tel:\\+?[0-9 ]{6,20}$");
    private static final Pattern MAILTO = Pattern.compile("^mailto:[^\\s@<>\"]+@[^\\s@<>\"]+\\.[^\\s@<>\"]+$");

    private SafeUrls() {}

    public static boolean isAllowed(String url) {
        if (url == null || url.isBlank() || url.length() > 2048) return false;
        String u = url.trim();
        String lower = u.toLowerCase(Locale.ROOT);
        if (lower.startsWith("mailto:")) return MAILTO.matcher(u).matches();
        if (lower.startsWith("tel:")) return TEL.matcher(u).matches();
        if (!lower.startsWith("https://")) return false;
        try {
            URI uri = new URI(u);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && !uri.getHost().isBlank() && uri.getUserInfo() == null;
        } catch (Exception e) {
            return false;
        }
    }

    public static String require(String field, String url) {
        if (!isAllowed(url)) throw ApiException.validation(field, "URL non autorisée (https, mailto, tel ou wa.me).");
        return url.trim();
    }

    public static String requireOptional(String field, String url) {
        return url == null || url.isBlank() ? null : require(field, url);
    }
}
