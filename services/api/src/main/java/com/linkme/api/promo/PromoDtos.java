package com.linkme.api.promo;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.UUID;

public final class PromoDtos {
    private PromoDtos() {}

    public record PromoQuote(String code, int percentOff, String plan, long priceXof, long discountXof, long finalPriceXof) {}

    public record PromoCodeInput(
            @NotNull @Pattern(regexp = "^[A-Za-z0-9_-]{3,24}$") String code,
            @NotNull @Min(1) @Max(100) Integer percentOff,
            @NotNull @Min(1) @Max(100000) Integer maxUses,
            Instant validUntil) {}

    public record AdminPromoCode(UUID id, String code, int percentOff, int maxUses, int usesCount, Instant validUntil, boolean active,
                                 Instant createdAt) {
        static AdminPromoCode of(PromoCode p) {
            return new AdminPromoCode(p.getId(), p.getCode(), p.getPercentOff(), p.getMaxUses(), p.getUsesCount(), p.getValidUntil(), p.isActive(),
                    p.getCreatedAt());
        }
    }
}
