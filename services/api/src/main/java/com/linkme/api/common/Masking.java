package com.linkme.api.common;

/**
 * Masquage des données personnelles des filleuls (D54) : le parrain voit qu'il a des filleuls et combien ils lui
 * rapportent, jamais leur identité complète ni leur numéro.
 */
public final class Masking {
    private Masking() {}

    /** « Aminata Diallo » → « Am*** D. » ; « Moussa » → « Mo*** » ; vide → « *** ». */
    public static String name(String raw) {
        if (raw == null || raw.isBlank()) return "***";
        String[] words = raw.trim().split("\\s+");
        String first = words[0];
        int keep = first.codePointCount(0, first.length()) >= 4 ? 2 : 1;
        StringBuilder sb = new StringBuilder(first.substring(0, first.offsetByCodePoints(0, keep))).append("***");
        if (words.length > 1) {
            String last = words[words.length - 1];
            sb.append(' ').append(last.substring(0, last.offsetByCodePoints(0, 1)).toUpperCase()).append('.');
        }
        return sb.toString();
    }

    /** « +221771234567 » → « +221 77 *** ** 67 » ; autre format → 4 premiers + étoiles + 2 derniers. */
    public static String phone(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String p = Phones.normalize(raw);
        if (p.startsWith("+221") && p.length() == 13) return "+221 " + p.substring(4, 6) + " *** ** " + p.substring(11);
        if (p.length() <= 6) return "***";
        return p.substring(0, 4) + "*".repeat(p.length() - 6) + p.substring(p.length() - 2);
    }
}
