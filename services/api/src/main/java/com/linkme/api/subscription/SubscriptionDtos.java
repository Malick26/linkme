package com.linkme.api.subscription;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class SubscriptionDtos {
    private SubscriptionDtos() {}

    /** Catalogue fixe (D45) : plus de plan gratuit publiable. */
    public record PlanCatalogEntry(String plan, long priceXof, int periodDays, boolean hasShop) {}

    public record SubscriptionStatusDto(String plan, String status, boolean canPublish, Instant expiresAt, Long daysRemaining) {}

    public record SubscriptionCheckoutRequest(
            @NotBlank @Pattern(regexp = "standard|boutique") String plan,
            String provider,
            @NotBlank @Size(max = 40) String phone,
            @Size(max = 64) String idempotencyKey,
            @Size(max = 24) String promoCode) {}

    public record SubscriptionCheckoutResponse(String reference, String paymentUrl, SubscriptionPaymentStatus status, long amountXof, long discountXof) {}

    public record SubscriptionPaymentView(String reference, SubscriptionPaymentStatus status, String plan, long amountXof, Instant paidAt) {}
}
