package com.linkme.api.uploads;

import com.linkme.api.common.ApiException;
import java.time.Clock;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Résolution des images (fournisseur → URL modèle) et contrôle de propriété (brief §6.3 : imageId appartenant au créateur). */
@Service
public class AssetService {
    private final AssetRepository assets;
    private final CloudinaryService cloudinary;
    private final SeedImages seed;
    private final Clock clock;

    public AssetService(AssetRepository assets, CloudinaryService cloudinary, SeedImages seed, Clock clock) {
        this.assets = assets;
        this.cloudinary = cloudinary;
        this.seed = seed;
        this.clock = clock;
    }

    public ImageDto toImage(Asset a) {
        return switch (a.getProvider()) {
            case "cloudinary" -> new ImageDto(a.getId().toString(), cloudinary.urlTemplate(a.getPublicId()), null, a.getWidth(), a.getHeight(), a.getPlaceholder());
            case "seed" -> {
                SeedImages.Meta m = seed.get(a.getPublicId());
                yield new ImageDto(a.getId().toString(), "/seed/" + a.getPublicId() + "-{w}.webp",
                        m == null ? List.of(640, 1080) : m.widths(), m == null ? null : m.width(), m == null ? null : m.height(),
                        m == null ? null : m.placeholder());
            }
            default -> new ImageDto(a.getId().toString(), "/media/" + a.getPublicId(), null, a.getWidth(), a.getHeight(), a.getPlaceholder());
        };
    }

    /** Son uploadé (item de bloc « sons », D50) : URL directe, pas de transformation nécessaire. */
    public AudioDto toAudio(Asset a) {
        String url = switch (a.getProvider()) {
            case "cloudinary" -> cloudinary.audioUrl(a.getPublicId());
            default -> "/media/" + a.getPublicId();
        };
        return new AudioDto(a.getId().toString(), url, a.getFormat(), a.getBytes());
    }

    @Transactional(readOnly = true)
    public Map<String, AudioDto> audios(Collection<UUID> ids) {
        List<UUID> clean = ids.stream().filter(Objects::nonNull).distinct().toList();
        Map<String, AudioDto> out = new LinkedHashMap<>();
        if (clean.isEmpty()) return out;
        for (Asset a : assets.findByIdIn(clean)) out.put(a.getId().toString(), toAudio(a));
        return out;
    }

    /** URL absolue ou relative d'une image 1200×630 pour l'aperçu de partage (brief §7.5). */
    public String ogImage(Asset a) {
        return switch (a.getProvider()) {
            case "cloudinary" -> cloudinary.ogImageUrl(a.getPublicId());
            case "seed" -> "/seed/" + a.getPublicId() + "-1080.webp";
            default -> "/media/" + a.getPublicId();
        };
    }

    @Transactional(readOnly = true)
    public Map<String, ImageDto> images(Collection<UUID> ids) {
        List<UUID> clean = ids.stream().filter(Objects::nonNull).distinct().toList();
        Map<String, ImageDto> out = new LinkedHashMap<>();
        if (clean.isEmpty()) return out;
        for (Asset a : assets.findByIdIn(clean)) out.put(a.getId().toString(), toImage(a));
        return out;
    }

    public ImageDto image(UUID id) {
        return id == null ? null : assets.findById(id).map(this::toImage).orElse(null);
    }

    /** Valide qu'un identifiant d'image existe et appartient au créateur ; renvoie l'UUID (ou null si vide). */
    @Transactional(readOnly = true)
    public UUID requireOwned(UUID ownerId, String field, String imageId) {
        return requireOwned(ownerId, field, imageId, "Image inconnue.");
    }

    /** Variante avec message dédié (ex. « Son inconnu. » pour {@code soundId}, D50). */
    @Transactional(readOnly = true)
    public UUID requireOwned(UUID ownerId, String field, String assetId, String notFoundMessage) {
        if (assetId == null || assetId.isBlank()) return null;
        UUID id;
        try {
            id = UUID.fromString(assetId);
        } catch (IllegalArgumentException e) {
            throw ApiException.validation(field, notFoundMessage);
        }
        Asset a = assets.findById(id).orElseThrow(() -> ApiException.validation(field, notFoundMessage));
        if (!ownerId.equals(a.getOwnerId())) throw ApiException.validation(field, notFoundMessage);
        return id;
    }

    @Transactional
    public Asset save(UUID ownerId, String provider, String publicId, String kind, Integer w, Integer h, String format, Integer bytes, String placeholder) {
        return assets.save(new Asset(ownerId, provider, publicId, kind, w, h, format, bytes, placeholder, clock.instant()));
    }
}
