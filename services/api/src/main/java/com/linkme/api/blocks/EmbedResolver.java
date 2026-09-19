package com.linkme.api.blocks;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Reconnaît les URL YouTube / Spotify et produit une URL d'intégration sûre (brief §5.5). */
public final class EmbedResolver {
    public record Embed(String provider, String src) {}

    private static final Pattern YT_ID = Pattern.compile("^[A-Za-z0-9_-]{6,20}$");
    private static final Pattern SPOTIFY = Pattern.compile("^/(?:intl-[a-z]{2}/)?(playlist|track|album|episode|show|artist)/([A-Za-z0-9]{10,40})/?$");

    private EmbedResolver() {}

    public static Embed resolve(String url) {
        if (url == null) return null;
        try {
            URI u = new URI(url.trim());
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null) return null;
            String host = u.getHost().toLowerCase();
            String path = u.getPath() == null ? "" : u.getPath();
            String id = null;
            if (host.equals("youtu.be")) {
                id = path.replaceFirst("^/", "");
            } else if (host.equals("www.youtube.com") || host.equals("youtube.com") || host.equals("m.youtube.com")) {
                if (path.equals("/watch") && u.getQuery() != null) {
                    for (String kv : u.getQuery().split("&")) if (kv.startsWith("v=")) id = kv.substring(2);
                } else if (path.startsWith("/shorts/") || path.startsWith("/embed/") || path.startsWith("/live/")) {
                    id = path.substring(path.indexOf('/', 1) + 1);
                }
            }
            if (id != null) return YT_ID.matcher(id).matches() ? new Embed("youtube", "https://www.youtube-nocookie.com/embed/" + id) : null;
            if (host.equals("open.spotify.com")) {
                Matcher m = SPOTIFY.matcher(path);
                if (m.matches()) return new Embed("spotify", "https://open.spotify.com/embed/" + m.group(1) + "/" + m.group(2));
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }
}
