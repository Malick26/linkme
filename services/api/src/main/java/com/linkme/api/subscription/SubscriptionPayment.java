package com.linkme.api.subscription;

import com.linkme.api.payments.Payable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Paiement d'une période d'abonnement (30 jours, D46). Ce n'est pas une vente à un client : le créateur paie la
 * plateforme pour que sa page publique reste visible. Même parcours fournisseur que les commandes boutique
 * ({@link Payable}, D47), table dédiée pour ne pas mélanger deux natures d'argent différentes.
 */
@Entity
@Table(name = "subscription_payment")
public class SubscriptionPayment implements Payable {
    @Id
    private UUID id;

    @Column(nullable = false, length = 15)
    private String reference;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(nullable = false, length = 8)
    private String plan;

    @Column(name = "period_days", nullable = false)
    private int periodDays;

    @Column(name = "amount_xof", nullable = false)
    private long amountXof;

    @Column(nullable = false, length = 3)
    private String currency = "XOF";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SubscriptionPaymentStatus status;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "provider_ref", length = 128)
    private String providerRef;

    @Column(name = "payment_url", length = 1024)
    private String paymentUrl;

    @Column(name = "payer_name", nullable = false, length = 80)
    private String payerName;

    @Column(name = "payer_phone", nullable = false, length = 20)
    private String payerPhone;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Column(name = "needs_attention", nullable = false)
    private boolean needsAttention;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    /** Code promo appliqué (D59) et réduction figée au checkout ; {@code amountXof} est déjà le prix réduit. */
    @Column(name = "promo_code_id")
    private UUID promoCodeId;

    @Column(name = "discount_xof", nullable = false)
    private long discountXof;

    protected SubscriptionPayment() {}

    public SubscriptionPayment(UUID creatorId, String plan, int periodDays, long amountXof, String provider, String payerName,
                               String payerPhone, String idempotencyKey, Instant now) {
        this.id = UUID.randomUUID();
        this.reference = com.linkme.api.common.Hashing.subscriptionReference();
        this.creatorId = creatorId;
        this.plan = plan;
        this.periodDays = periodDays;
        this.amountXof = amountXof;
        this.status = SubscriptionPaymentStatus.PENDING;
        this.provider = provider;
        this.payerName = payerName;
        this.payerPhone = payerPhone;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    @Override public String getReference() { return reference; }
    @Override public UUID getCreatorId() { return creatorId; }
    public String getPlan() { return plan; }
    public int getPeriodDays() { return periodDays; }
    @Override public long getAmountXof() { return amountXof; }
    @Override public String getCurrency() { return currency; }
    public SubscriptionPaymentStatus getStatus() { return status; }
    @Override public String getProvider() { return provider; }
    @Override public String getProviderRef() { return providerRef; }
    public String getPaymentUrl() { return paymentUrl; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public boolean isNeedsAttention() { return needsAttention; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPaidAt() { return paidAt; }
    public UUID getPromoCodeId() { return promoCodeId; }
    public long getDiscountXof() { return discountXof; }

    public void applyPromo(UUID promoCodeId, long discountXof) {
        if (discountXof < 0 || discountXof > amountXof) throw new IllegalArgumentException("réduction");
        this.promoCodeId = promoCodeId;
        this.discountXof = discountXof;
        this.amountXof = amountXof - discountXof;
    }

    @Override
    public String checkoutDescription() {
        String label = "boutique".equals(plan) ? "Boutique" : "Standard";
        return "Abonnement LinkMe — " + label + " (" + periodDays + " jours)";
    }

    @Override
    public String buyerName() { return payerName; }

    @Override
    public String buyerPhone() { return payerPhone; }

    public void attachPayment(String providerRef, String paymentUrl, Instant now) {
        this.providerRef = providerRef;
        this.paymentUrl = paymentUrl;
        this.updatedAt = now;
    }

    /** Transition d'état : uniquement depuis PENDING (idempotence : un état final ne bouge plus). */
    public boolean transition(SubscriptionPaymentStatus to, Instant now) {
        if (status.isFinal() || to == SubscriptionPaymentStatus.PENDING) return false;
        this.status = to;
        this.updatedAt = now;
        if (to == SubscriptionPaymentStatus.PAID) this.paidAt = now;
        return true;
    }

    public void flag(Instant now) {
        this.needsAttention = true;
        this.updatedAt = now;
    }
}
