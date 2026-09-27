package com.linkme.api.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Compte de parrainage d'un créateur (D51) : code stable à partager, et éventuellement un taux « collab » négocié
 * par l'équipe (≤ 60 %) valable jusqu'à une date d'expiration (D52). Sans collab active : taux de base (20 %).
 */
@Entity
@Table(name = "referral_account")
public class ReferralAccount {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 12)
    private String code;

    @Column(name = "collab_rate_bps")
    private Integer collabRateBps;

    @Column(name = "collab_expires_at")
    private Instant collabExpiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReferralAccount() {}

    public ReferralAccount(UUID userId, String code, Instant now) {
        this.userId = userId;
        this.code = code;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getUserId() { return userId; }
    public String getCode() { return code; }
    public Integer getCollabRateBps() { return collabRateBps; }
    public Instant getCollabExpiresAt() { return collabExpiresAt; }

    /** Collab en cours : taux négocié et échéance strictement dans le futur. */
    public boolean collabActive(Instant now) {
        return collabRateBps != null && collabExpiresAt != null && collabExpiresAt.isAfter(now);
    }

    /** Taux applicable à un paiement encaissé à {@code now} (figé ensuite dans le gain). */
    public int effectiveRateBps(int baseRateBps, Instant now) {
        return collabActive(now) ? Math.max(baseRateBps, collabRateBps) : baseRateBps;
    }

    public void startCollab(int rateBps, Instant expiresAt, Instant now) {
        this.collabRateBps = rateBps;
        this.collabExpiresAt = expiresAt;
        this.updatedAt = now;
    }

    public void endCollab(Instant now) {
        this.collabRateBps = null;
        this.collabExpiresAt = null;
        this.updatedAt = now;
    }
}
