package com.linkme.api.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Demande de retrait vers un compte mobile money, traitée à la main par l'équipe (D56). */
@Entity
@Table(name = "withdrawal")
public class Withdrawal {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "amount_xof", nullable = false)
    private long amountXof;

    @Column(nullable = false, length = 16)
    private String method;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private WithdrawalStatus status;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Column(name = "provider_ref", length = 128)
    private String providerRef;

    @Column(length = 500)
    private String note;

    @Column(name = "processed_by")
    private UUID processedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    protected Withdrawal() {}

    public Withdrawal(UUID userId, long amountXof, String method, String phone, String idempotencyKey, Instant now) {
        if (amountXof <= 0) throw new IllegalArgumentException("montant");
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.amountXof = amountXof;
        this.method = method;
        this.phone = phone;
        this.idempotencyKey = idempotencyKey;
        this.status = WithdrawalStatus.REQUESTED;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public long getAmountXof() { return amountXof; }
    public String getMethod() { return method; }
    public String getPhone() { return phone; }
    public WithdrawalStatus getStatus() { return status; }
    public String getProviderRef() { return providerRef; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getProcessedAt() { return processedAt; }

    /** Décision admin, une seule fois : un retrait payé ou refusé ne bouge plus. */
    public boolean decide(WithdrawalStatus to, UUID adminId, String providerRef, String note, Instant now) {
        if (status.isFinal() || to == WithdrawalStatus.REQUESTED) return false;
        this.status = to;
        this.processedBy = adminId;
        this.providerRef = providerRef;
        this.note = note;
        this.processedAt = now;
        this.updatedAt = now;
        return true;
    }
}
