package com.linkme.api.profile;

import com.linkme.api.uploads.ImageDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ProfileDtos {
    private ProfileDtos() {}

    public static final String PLATFORMS = "tiktok|instagram|youtube|snapchat|x|facebook|linkedin|twitch|spotify|whatsapp";

    public record ProfileDto(String handle, String displayName, List<String> taglineLines, List<String> categories, String bio,
                             String backgroundImageId, ImageDto backgroundImage, boolean published, String plan, boolean onboardingCompleted,
                             String subscriptionStatus, Instant subscriptionExpiresAt) {}

    public record ProfileUpdate(
            @NotBlank @Size(max = 60) String displayName,
            @NotNull @Size(max = 3) List<@NotNull @Size(max = 40) String> taglineLines,
            @NotNull @Size(max = 3) List<@NotBlank @Size(max = 24) String> categories,
            @NotNull @Size(max = 160) String bio,
            @Size(max = 64) String backgroundImageId,
            Boolean published,
            Boolean onboardingCompleted) {}

    public record SocialAccountInput(
            @NotBlank @Pattern(regexp = PLATFORMS) String platform,
            @NotBlank @Size(max = 2048) String url,
            @NotNull @Min(0) @Max(10_000_000_000L) Long followersCount) {}

    public record SocialsUpdate(@NotNull @Size(max = 10) List<@Valid @NotNull SocialAccountInput> items) {}

    public record SocialAccountDto(UUID id, String platform, String url, long followersCount, int position, Instant updatedAt) {}

    public record StatsInput(
            @NotNull @Min(0) @Max(100_000_000_000L) Long followers,
            @NotNull @Min(0) @Max(100_000_000_000L) Long likes,
            @NotNull @Min(0) @Max(100_000_000_000L) Long views30d) {}

    public record StatsDto(long followers, long likes, long views30d, Instant updatedAt) {}
}
