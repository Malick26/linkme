package com.linkme.api.theme;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Apparence complète d'une page (ADR 0004) — miroir exact du schéma OpenAPI {@code ThemeConfig}.
 * Polices et énumérations en liste blanche ; couleurs hex ; bornes numériques. La propriété de {@code imageId}
 * est vérifiée par {@link ThemeService}.
 */
public record ThemeConfig(
        @NotNull @Min(1) @Max(1) Integer version,
        @NotNull @Pattern(regexp = PRESETS) String preset,
        @NotNull @Valid Colors colors,
        @NotNull @Valid Background background,
        @NotNull @Valid Typography typography,
        @NotNull @Valid Cards cards,
        @NotNull @Valid Social social,
        @NotNull @Valid Layout layout,
        @NotNull @Valid Motion motion) {

    public static final String HEX = "^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$";
    public static final String PRESETS = "sunset|midnight-blue|emerald-night|rose-gold|clean-light|custom";

    public record Colors(
            @NotNull @Pattern(regexp = HEX) String accent,
            @NotNull @Pattern(regexp = HEX) String text,
            @NotNull @Pattern(regexp = HEX) String textMuted,
            @NotNull @Pattern(regexp = HEX) String cardBg,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double cardBgOpacity,
            @NotNull @Pattern(regexp = HEX) String cardBorder,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double cardBorderOpacity,
            @NotNull @Pattern(regexp = HEX) String overlay,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double overlayStrength,
            @NotNull @Pattern(regexp = HEX) String statGlow) {}

    public record Focal(@NotNull @DecimalMin("0") @DecimalMax("1") Double x, @NotNull @DecimalMin("0") @DecimalMax("1") Double y) {}

    public record Background(
            @NotNull @Pattern(regexp = "image|gradient|solid") String type,
            @Size(max = 64) String imageId,
            @Pattern(regexp = HEX) String color,
            @Pattern(regexp = HEX) String gradientFrom,
            @Pattern(regexp = HEX) String gradientTo,
            @Min(0) @Max(360) Integer gradientAngle,
            @NotNull @Valid Focal focal,
            @NotNull @Min(0) @Max(30) Integer blur) {

        public Background withImageId(String id) {
            return new Background(type, id, color, gradientFrom, gradientTo, gradientAngle, focal, blur);
        }
    }

    public record Typography(
            @NotNull @Pattern(regexp = "kaushan-script|yellowtail|marck-script|caveat-brush") String display,
            @NotNull @Pattern(regexp = "caveat|reenie-beanie") String hand,
            @NotNull @Pattern(regexp = "inter|system") String body,
            @NotNull @DecimalMin("0.7") @DecimalMax("1.3") Double nameScale) {}

    public record Cards(
            @NotNull @Pattern(regexp = "glass|solid|outline") String style,
            @NotNull @Min(0) @Max(36) Integer radius,
            @NotNull Boolean showThumbnail,
            @NotNull @Pattern(regexp = "left|right") String thumbnailSide,
            @NotNull @Pattern(regexp = "compact|comfortable") String density,
            @NotNull @Min(0) @Max(40) Integer blur) {}

    public record Social(
            @NotNull @Pattern(regexp = "right|left|below-stats") String position,
            @NotNull Boolean showCounts,
            @NotNull @Pattern(regexp = "circle|rounded|square") String shape) {}

    public record Layout(
            @NotNull Boolean showTagline,
            @NotNull Boolean showCrown,
            @NotNull Boolean showStats,
            @NotNull Boolean showCategories,
            @NotNull @Size(max = 40) String footerText) {}

    public record Motion(@NotNull Boolean enabled) {}

    public ThemeConfig withBackground(Background bg) {
        return new ThemeConfig(version, preset, colors, bg, typography, cards, social, layout, motion);
    }
}
