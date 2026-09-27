package com.linkme.api.common;

/** Normalisation d'un numéro de téléphone écrit librement (espaces, points, tirets, parenthèses). */
public final class Phones {
    private Phones() {}

    /** « (221) 77-123-45-67 » → « +221771234567 » : on ne garde que l'indicatif et les chiffres. */
    public static String normalize(String raw) {
        String s = raw.trim();
        String plus = s.startsWith("+") ? "+" : "";
        return plus + s.replaceAll("\\D", "");
    }

    public static boolean isValid(String raw) {
        if (raw == null || raw.isBlank()) return false;
        int digits = normalize(raw).replaceAll("\\D", "").length();
        return digits >= 8 && digits <= 15;
    }
}
