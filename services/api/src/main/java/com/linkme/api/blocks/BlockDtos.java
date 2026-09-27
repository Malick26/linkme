package com.linkme.api.blocks;

import com.linkme.api.uploads.AudioDto;
import com.linkme.api.uploads.ImageDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class BlockDtos {
    private BlockDtos() {}

    public static final String TYPES = "travel|shop|music|content|contact|link";
    public static final String ICONS = "plane|shopping-bag|music|clapperboard|mail|link|camera|heart|star|map-pin|mic|gamepad|book|briefcase";

    public record BlockConfig(
            @Pattern(regexp = "^\\+?[0-9]{8,15}$") String whatsapp,
            @Email @Size(max = 254) String email,
            @Pattern(regexp = "^\\+?[0-9]{8,15}$") String phone) {}

    public record BlockInput(
            @NotBlank @Pattern(regexp = TYPES) String type,
            @NotBlank @Size(max = 40) String title,
            @Size(max = 80) String subtitle,
            @Pattern(regexp = ICONS) String icon,
            @Size(max = 64) String thumbnailImageId,
            @Size(max = 64) String backgroundImageId,
            @Size(max = 2048) String url,
            Boolean visible,
            @Valid BlockConfig config) {}

    public record BlockDto(UUID id, String type, String slug, String title, String subtitle, String icon, String thumbnailImageId,
                           ImageDto thumbnail, String backgroundImageId, ImageDto backgroundImage, String url, int position,
                           boolean visible, BlockConfig config, Integer itemCount) {}

    public record BlockItemInput(
            @NotBlank @Size(max = 80) String title,
            @Size(max = 500) String description,
            @Size(max = 2048) String url,
            @Size(max = 64) String imageId,
            @Size(max = 64) String soundId) {}

    public record Embed(String provider, String src) {}

    public record BlockItemDto(UUID id, String title, String description, String url, String imageId, ImageDto image,
                               String soundId, AudioDto sound, Embed embed, int position) {}

    public record OrderRequest(@NotNull @Size(max = 200) List<UUID> ids) {}
}
