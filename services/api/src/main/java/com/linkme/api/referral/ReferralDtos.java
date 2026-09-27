package com.linkme.api.referral;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ReferralDtos {
    private ReferralDtos() {}

    public record ReferralCodeInfo(String code, String referrerName) {}

    public record Collab(int rateBps, Instant expiresAt) {}

    public record Referee(String maskedName, String maskedPhone, Instant joinedAt, String status, long earnedXof) {}

    public record ReferralEarningView(UUID id, Instant createdAt, String refereeMaskedName, long baseAmountXof, int rateBps, long amountXof,
                                      String status, Instant availableAt, String blockReason) {}

    public record ReferralStats(int signups, int activeReferees, long realEarnedXof, long currentMonthlyXof, long potentialMonthlyXof) {}

    public record ReferralOverview(String code, String link, int baseRateBps, int effectiveRateBps, Collab collab, ReferralStats stats,
                                   List<Referee> referees, List<ReferralEarningView> recentEarnings) {}

    public record WithdrawalView(UUID id, long amountXof, String method, String maskedPhone, WithdrawalStatus status, Instant createdAt,
                                 Instant processedAt, String note) {}

    public record Wallet(long availableXof, long heldXof, long pendingWithdrawalXof, long totalEarnedXof, long totalWithdrawnXof,
                         long minWithdrawalXof, int holdDays, Instant nextReleaseAt, List<WithdrawalView> withdrawals) {}

    public record WithdrawalRequest(
            @NotNull @Min(1) Long amountXof,
            @NotBlank @Pattern(regexp = "wave|orange_money|free_money") String method,
            @NotBlank @Size(max = 40) String phone,
            @Size(max = 64) String idempotencyKey) {}

    public record WithdrawalDecision(@Size(max = 128) String providerRef, @Size(max = 500) String note) {}

    public record FraudSignals(long blockedSelfPayments, long sameDayIpReferrals, int referees, int activeReferees) {}

    public record AdminCreator(UUID userId, String handle, String displayName, String email) {}

    public record AdminWithdrawal(UUID id, long amountXof, String method, String phone, WithdrawalStatus status, Instant createdAt,
                                  Instant processedAt, String providerRef, String note, AdminCreator creator, FraudSignals signals) {}

    public record AdminReferrer(UUID userId, String handle, String displayName, String code, int baseRateBps, int effectiveRateBps,
                                Collab collab, int referees, int activeReferees, long totalEarnedXof) {}

    public record AdminCollab(UUID userId, String handle, String displayName, int rateBps, Instant expiresAt, boolean active, int referees,
                              int activeReferees, long totalEarnedXof) {}

    public record CollabRequest(@NotNull @Min(2000) @Max(6000) Integer rateBps, @NotNull Instant expiresAt) {}
}
