package com.linkme.api.announcement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AnnouncementDtos {
    private AnnouncementDtos() {}

    public record PublicAnnouncement(UUID id, String title, String body, String ctaLabel, String ctaUrl) {}

    public record AnnouncementInput(
            @NotBlank @Size(max = 80) String title,
            @NotBlank @Size(max = 500) String body,
            @Size(max = 40) String ctaLabel,
            @Size(max = 500) String ctaUrl,
            @NotBlank @Pattern(regexp = "landing|dashboard|both") String audience,
            Instant startsAt,
            Instant endsAt,
            @NotNull Boolean active) {}

    public record AdminAnnouncement(UUID id, String title, String body, String ctaLabel, String ctaUrl, String audience, Instant startsAt,
                                    Instant endsAt, boolean active, boolean live, Instant createdAt) {}
}
