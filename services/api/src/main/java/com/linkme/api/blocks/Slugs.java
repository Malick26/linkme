package com.linkme.api.blocks;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Slugs d'URL des blocs (/{handle}/{slug}). */
public final class Slugs {
    /** Slugs par défaut des types de base (maquette / seed). */
    public static final Map<String, String> DEFAULTS = Map.of(
            "travel", "voyages", "shop", "shop", "music", "sons", "content", "contenus", "contact", "contact", "link", "lien");

    /** Segments réservés par les routes publiques du front. */
    public static final Set<String> RESERVED = Set.of("commande");

    private Slugs() {}

    public static String slugify(String s) {
        String n = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        n = n.toLowerCase(Locale.ROOT).replace("œ", "oe").replace("æ", "ae").replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (n.length() > 32) n = n.substring(0, 32).replaceAll("-+$", "");
        return n.isEmpty() ? "bloc" : n;
    }
}
