package com.linkme.api.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/**
 * Écriture du grand livre du portefeuille (append-only, D55). Le solde n'est jamais stocké : c'est la somme des
 * écritures dont {@code availableAt} est passé. Gain = positif gelé 7 jours ; retrait = négatif immédiat (réserve) ;
 * refus d'un retrait = positif immédiat (recrédit).
 */
@Entity
@Immutable
@Table(name = "wallet_entry")
public class WalletEntry {
    public enum Kind { REFERRAL_EARNING, WITHDRAWAL, WITHDRAWAL_REVERSAL }

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 24)
    private String kind;

    @Column(name = "amount_xof", nullable = false)
    private long amountXof;

    @Column(name = "earning_id")
    private UUID earningId;

    @Column(name = "withdrawal_id")
    private UUID withdrawalId;

    @Column(name = "available_at", nullable = false)
    private Instant availableAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WalletEntry() {}

    private WalletEntry(UUID userId, Kind kind, long amountXof, UUID earningId, UUID withdrawalId, Instant availableAt, Instant now) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.kind = kind.name();
        this.amountXof = amountXof;
        this.earningId = earningId;
        this.withdrawalId = withdrawalId;
        this.availableAt = availableAt;
        this.createdAt = now;
    }

    public static WalletEntry earning(ReferralEarning e, Instant now) {
        if (e.isBlocked() || e.getAmountXof() <= 0) throw new IllegalArgumentException("gain non créditable");
        return new WalletEntry(e.getReferrerId(), Kind.REFERRAL_EARNING, e.getAmountXof(), e.getId(), null, e.getAvailableAt(), now);
    }

    public static WalletEntry withdrawal(Withdrawal w, Instant now) {
        return new WalletEntry(w.getUserId(), Kind.WITHDRAWAL, -w.getAmountXof(), null, w.getId(), now, now);
    }

    public static WalletEntry reversal(Withdrawal w, Instant now) {
        return new WalletEntry(w.getUserId(), Kind.WITHDRAWAL_REVERSAL, w.getAmountXof(), null, w.getId(), now, now);
    }

    public UUID getUserId() { return userId; }
    public String getKind() { return kind; }
    public long getAmountXof() { return amountXof; }
    public Instant getAvailableAt() { return availableAt; }
}
