package com.linkme.api.crm;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class CrmDtos {
    private CrmDtos() {}

    public static final String SEGMENTS = "prospects|never_subscribed|expiring_soon|expired|active";

    public record ProspectInput(
            @Size(max = 60) String name,
            @Email @Size(max = 254) String email,
            @Size(max = 40) String phone,
            @NotNull @AssertTrue Boolean consent,
            @Size(max = 200) String website) {}

    public record UnsubscribeRequest(@NotBlank @Size(max = 64) String token) {}

    public record CrmContact(String kind, UUID id, String name, String email, String phone, String handle, String subscriptionStatus,
                             Instant subscriptionExpiresAt, Instant createdAt, Instant lastContactedAt, boolean optedOut) {}

    public record CrmEmailRequest(
            @NotBlank @Pattern(regexp = SEGMENTS) String segment,
            @NotBlank @Size(max = 150) String subject,
            @NotBlank @Size(max = 5000) String body) {}

    public record CrmEmailResult(int sent, int skipped) {}

    public record LogRequest(@NotBlank @Pattern(regexp = "whatsapp|email") String channel) {}
}
