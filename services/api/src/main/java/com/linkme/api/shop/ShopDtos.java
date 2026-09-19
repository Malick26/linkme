package com.linkme.api.shop;

import com.linkme.api.common.PageMeta;
import com.linkme.api.uploads.ImageDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ShopDtos {
    private ShopDtos() {}

    public record ProductInput(
            @NotBlank @Size(max = 80) String title,
            @NotNull @Min(100) @Max(10_000_000) Long priceXof,
            @Size(max = 2000) String description,
            @Min(0) @Max(100_000) Integer stock,
            @NotNull Boolean active,
            @NotNull @Size(min = 1, max = 5) List<@NotBlank @Size(max = 64) String> imageIds) {}

    public record ProductDto(UUID id, String title, long priceXof, String description, Integer stock, boolean active,
                             List<String> imageIds, List<ImageDto> images, Instant createdAt) {}

    public record PublicProductDto(UUID id, String title, long priceXof, String description, List<ImageDto> images, boolean available) {}

    public record CheckoutRequest(
            @NotNull UUID productId,
            @NotNull @Min(1) @Max(10) Integer quantity,
            @NotBlank @Size(min = 2, max = 80) String buyerName,
            @NotBlank @Pattern(regexp = "^\\+?[0-9 ]{8,20}$") String buyerPhone,
            @Email @Size(max = 254) String buyerEmail,
            @Pattern(regexp = "mock|paydunya|cinetpay") String provider,
            @Size(max = 64) String idempotencyKey) {}

    public record CheckoutResponse(String reference, String paymentUrl, OrderStatus status, long amountXof) {}

    public record OrderStatusView(String reference, OrderStatus status, long amountXof, String productTitle, int quantity,
                                  String creatorHandle, String creatorName, Instant paidAt) {}

    public record OrderDto(UUID id, String reference, OrderStatus status, long amountXof, long commissionXof, long netXof, String provider,
                           String productTitle, int quantity, String buyerName, String buyerPhone, String buyerEmail,
                           PayoutStatus payoutStatus, boolean needsAttention, Instant createdAt, Instant paidAt) {}

    public record OrderPage(List<OrderDto> items, PageMeta page) {}

    public record DayEarnings(LocalDate date, long netXof, int orders) {}

    public record Earnings(long grossXof, long commissionXof, long netXof, long pendingPayoutXof, long paidOutXof, int paidOrders,
                           BigDecimal commissionPercent, List<DayEarnings> last30Days) {}
}
