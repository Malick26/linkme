package com.linkme.api.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Lien parrain → filleul, fixé à l'inscription et jamais modifié (D53). */
@Entity
@Table(name = "referral")
public class Referral {
    @Id
    @Column(name = "referee_id")
    private UUID refereeId;

    @Column(name = "referrer_id", nullable = false)
    private UUID referrerId;

    @Column(name = "signup_ip_hash", length = 64)
    private String signupIpHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Referral() {}

    public Referral(UUID refereeId, UUID referrerId, String signupIpHash, Instant now) {
        if (refereeId.equals(referrerId)) throw new IllegalArgumentException("auto-parrainage");
        this.refereeId = refereeId;
        this.referrerId = referrerId;
        this.signupIpHash = signupIpHash;
        this.createdAt = now;
    }

    public UUID getRefereeId() { return refereeId; }
    public UUID getReferrerId() { return referrerId; }
    public String getSignupIpHash() { return signupIpHash; }
    public Instant getCreatedAt() { return createdAt; }
}
