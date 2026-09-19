package com.linkme.api.uploads;

import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.config.AppProperties;
import java.time.Clock;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Upload signé côté client (D8) : le secret ne quitte jamais le serveur. Le client envoie le fichier directement à
 * Cloudinary avec la signature, puis déclare l'asset via {@code /uploads/complete} (signature de réponse vérifiée).
 */
@Service
public class CloudinaryService {
    public static final String ALLOWED_FORMATS = "jpg,jpeg,png,webp";
    private final AppProperties.Cloudinary cfg;
    private final Clock clock;
    private final long maxBytes;

    public CloudinaryService(AppProperties props, Clock clock) {
        this.cfg = props.cloudinary();
        this.clock = clock;
        this.maxBytes = props.media().maxBytes();
    }

    public boolean enabled() {
        return cfg != null && cfg.enabled();
    }

    public record Signature(String uploadUrl, String apiKey, long timestamp, String signature, String folder, String allowedFormats, long maxBytes) {}

    public String folderFor(UUID ownerId) {
        return "linkme/" + ownerId;
    }

    public Signature sign(UUID ownerId) {
        if (!enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UPLOAD_UNAVAILABLE", "Cloudinary n'est pas configuré.");
        }
        long ts = clock.instant().getEpochSecond();
        String folder = folderFor(ownerId);
        Map<String, String> params = new TreeMap<>();
        params.put("allowed_formats", ALLOWED_FORMATS);
        params.put("folder", folder);
        params.put("timestamp", String.valueOf(ts));
        return new Signature("https://api.cloudinary.com/v1_1/" + cfg.cloudName() + "/image/upload", cfg.apiKey(), ts,
                signParams(params, cfg.apiSecret()), folder, ALLOWED_FORMATS, maxBytes);
    }

    /** Algorithme Cloudinary : paramètres triés « k=v » joints par « & », suffixés du secret, SHA-1 hex. */
    public static String signParams(Map<String, String> params, String secret) {
        String toSign = new TreeMap<>(params).entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));
        return Hashing.sha1Hex(toSign + secret);
    }

    /** Vérifie la signature renvoyée par Cloudinary dans la réponse d'upload ({@code public_id} + {@code version}). */
    public boolean verifyUploadResponse(String publicId, long version, String signature) {
        String expected = signParams(Map.of("public_id", publicId, "version", String.valueOf(version)), cfg.apiSecret());
        return Hashing.constantTimeEquals(expected, signature);
    }

    public String urlTemplate(String publicId) {
        return "https://res.cloudinary.com/" + cfg.cloudName() + "/image/upload/f_auto,q_auto,c_limit,w_{w}/" + publicId;
    }

    public String ogImageUrl(String publicId) {
        return "https://res.cloudinary.com/" + cfg.cloudName() + "/image/upload/f_auto,q_auto,c_fill,g_auto,w_1200,h_630/" + publicId;
    }
}
