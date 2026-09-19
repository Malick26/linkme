package com.linkme.api.theme;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linkme.api.common.ApiException;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.uploads.AssetService;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ThemeService {
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};
    private final ThemeRepository themes;
    private final ThemePresets presets;
    private final AssetService assets;
    private final CreatorProfileRepository profiles;
    private final ObjectMapper mapper;
    private final Clock clock;

    public ThemeService(ThemeRepository themes, ThemePresets presets, AssetService assets, CreatorProfileRepository profiles,
                        ObjectMapper mapper, Clock clock) {
        this.themes = themes;
        this.presets = presets;
        this.assets = assets;
        this.profiles = profiles;
        this.mapper = mapper;
        this.clock = clock;
    }

    public record ThemeState(ThemeConfig draft, ThemeConfig published, int version, boolean hasUnpublishedChanges,
                             Instant updatedAt, Instant publishedAt) {}

    public ThemeConfig toConfig(Map<String, Object> json) {
        return json == null ? null : mapper.convertValue(json, ThemeConfig.class);
    }

    private Map<String, Object> toJson(ThemeConfig c) {
        return mapper.convertValue(c, MAP);
    }

    @Transactional
    public ThemeEntity getOrCreate(UUID creatorId) {
        return themes.findById(creatorId)
                .orElseGet(() -> themes.save(new ThemeEntity(creatorId, toJson(presets.defaultTheme()), clock.instant())));
    }

    @Transactional
    public ThemeState state(UUID creatorId) {
        return toState(getOrCreate(creatorId));
    }

    private ThemeState toState(ThemeEntity t) {
        ThemeConfig draft = toConfig(t.getDraft());
        ThemeConfig pub = toConfig(t.getPublished());
        return new ThemeState(draft, pub, t.getVersion(), !Objects.equals(t.getDraft(), t.getPublished()), t.getUpdatedAt(), t.getPublishedAt());
    }

    /** Enregistre le brouillon après validation serveur (Bean Validation en amont + propriété de l'image ici). */
    @Transactional
    public ThemeState saveDraft(UUID creatorId, ThemeConfig config) {
        UUID img = assets.requireOwned(creatorId, "background.imageId", config.background().imageId());
        ThemeConfig clean = config.withBackground(config.background().withImageId(img == null ? null : img.toString()));
        ThemeEntity t = getOrCreate(creatorId);
        t.saveDraft(toJson(clean), clock.instant());
        return toState(t);
    }

    /** Publie le brouillon et rend la page visible (onboarding → « Publier »). */
    @Transactional
    public ThemeState publish(UUID creatorId) {
        ThemeEntity t = getOrCreate(creatorId);
        Instant now = clock.instant();
        t.publish(now);
        profiles.findById(creatorId).orElseThrow(ApiException::notFound).setPublished(true, now);
        return toState(t);
    }

    @Transactional(readOnly = true)
    public ThemeConfig published(UUID creatorId) {
        return themes.findById(creatorId).map(t -> toConfig(t.getPublished() != null ? t.getPublished() : t.getDraft()))
                .orElse(presets.defaultTheme());
    }

    @Transactional(readOnly = true)
    public ThemeConfig draft(UUID creatorId) {
        return themes.findById(creatorId).map(t -> toConfig(t.getDraft())).orElse(presets.defaultTheme());
    }
}
