package com.linkme.api.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class Hashing {
    private static final SecureRandom RANDOM = new SecureRandom();

    private Hashing() {}

    public static String sha256Hex(String s) {
        return digestHex("SHA-256", s);
    }

    public static String sha1Hex(String s) {
        return digestHex("SHA-1", s);
    }

    public static String sha512Hex(String s) {
        return digestHex("SHA-512", s);
    }

    private static String digestHex(String algo, String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance(algo).digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String hmacSha256Hex(String secret, byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Comparaison en temps constant (signatures). */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    public static String randomToken(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    private static final char[] ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    /** Référence de commande non devinable : LM-XXXXXXXXXXXX (alphabet sans caractères ambigus). */
    public static String orderReference() {
        return reference("LM-");
    }

    /** Référence de paiement d'abonnement : SB-XXXXXXXXXXXX. Préfixe distinct de LM- pour le dispatch au webhook (D47). */
    public static String subscriptionReference() {
        return reference("SB-");
    }

    private static String reference(String prefix) {
        StringBuilder sb = new StringBuilder(prefix);
        for (int i = 0; i < 12; i++) sb.append(ALNUM[RANDOM.nextInt(ALNUM.length)]);
        return sb.toString();
    }
}
