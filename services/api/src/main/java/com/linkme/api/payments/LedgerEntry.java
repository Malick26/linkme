package com.linkme.api.payments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/** Écriture du grand livre (immuable). Brut, commission (négative), net créateur ; PAYOUT (négatif) au reversement. */
@Entity
@Immutable
@Table(name = "ledger_entry")
public class LedgerEntry {
    public enum Kind { SALE_GROSS, COMMISSION, CREATOR_NET, PAYOUT }

    @Id
    private UUID id;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(nullable = false, length = 16)
    private String kind;

    @Column(name = "amount_xof", nullable = false)
    private long amountXof;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LedgerEntry() {}

    public LedgerEntry(UUID creatorId, UUID orderId, Kind kind, long amountXof, Instant now) {
        this.id = UUID.randomUUID();
        this.creatorId = creatorId;
        this.orderId = orderId;
        this.kind = kind.name();
        this.amountXof = amountXof;
        this.createdAt = now;
    }

    public String getKind() { return kind; }
    public long getAmountXof() { return amountXof; }
    public UUID getOrderId() { return orderId; }
}
