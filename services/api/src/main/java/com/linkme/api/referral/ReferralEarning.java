package com.linkme.api.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/**
 * Gain de parrainage : un par paiement d'abonnement du filleul (D51). Taux et montant figés au moment du paiement,
 * ligne immuable (append-only en base). Un gain bloqué (auto-parrainage) reste tracé mais ne crédite rien (D54).
 */
@Entity
@Immutable
@Table(name = "referral_earning")
public class ReferralEarning {
    public static final String SELF_PAYMENT = "SELF_PAYMENT";

    @Id
    private UUID id;

    @Column(name = "referrer_id", nullable = false)
    private UUID referrerId;

    @Column(name = "referee_id", nullable = false)
    private UUID refereeId;

    @Column(name = "subscription_payment_id", nullable = false)
    private UUID subscriptionPaymentId;

    @Column(name = "base_amount_xof", nullable = false)
    private long baseAmountXof;

    @Column(name = "rate_bps", nullable = false)
    private int rateBps;

    @Column(name = "amount_xof", nullable = false)
    private long amountXof;

    @Column(name = "blocked_reason", length = 20)
    private String blockedReason;

    @Column(name = "available_at", nullable = false)
    private Instant availableAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ReferralEarning() {}

    public ReferralEarning(UUID referrerId, UUID refereeId, UUID subscriptionPaymentId, long baseAmountXof, int rateBps,
                           String blockedReason, Instant availableAt, Instant now) {
        this.id = UUID.randomUUID();
        this.referrerId = referrerId;
        this.refereeId = refereeId;
        this.subscriptionPaymentId = subscriptionPaymentId;
        this.baseAmountXof = baseAmountXof;
        this.rateBps = rateBps;
        this.amountXof = commission(baseAmountXof, rateBps);
        this.blockedReason = blockedReason;
        this.availableAt = availableAt;
        this.createdAt = now;
    }

    /** Commission de parrainage en FCFA entiers, arrondie à l'unité inférieure (jamais de double — règle 6). */
    public static long commission(long baseAmountXof, int rateBps) {
        if (baseAmountXof < 0 || rateBps < 0) throw new IllegalArgumentException("montant ou taux négatif");
        return Math.multiplyExact(baseAmountXof, (long) rateBps) / 10_000L;
    }

    public UUID getId() { return id; }
    public UUID getReferrerId() { return referrerId; }
    public UUID getRefereeId() { return refereeId; }
    public UUID getSubscriptionPaymentId() { return subscriptionPaymentId; }
    public long getBaseAmountXof() { return baseAmountXof; }
    public int getRateBps() { return rateBps; }
    public long getAmountXof() { return amountXof; }
    public String getBlockedReason() { return blockedReason; }
    public boolean isBlocked() { return blockedReason != null; }
    public Instant getAvailableAt() { return availableAt; }
    public Instant getCreatedAt() { return createdAt; }
}
