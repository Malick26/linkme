package com.linkme.api.shop;

import com.linkme.api.payments.Payable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Commande. Montants et commission figés à la création (brief §7.4). Jamais supprimée. */
@Entity
@Table(name = "orders")
public class ShopOrder implements Payable {
    @Id
    private UUID id;

    @Column(nullable = false, length = 15)
    private String reference;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_title", nullable = false, length = 80)
    private String productTitle;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price_xof", nullable = false)
    private long unitPriceXof;

    @Column(name = "amount_xof", nullable = false)
    private long amountXof;

    @Column(name = "commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPercent;

    @Column(name = "commission_xof", nullable = false)
    private long commissionXof;

    @Column(name = "net_xof", nullable = false)
    private long netXof;

    @Column(nullable = false, length = 3)
    private String currency = "XOF";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderStatus status;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "provider_ref", length = 128)
    private String providerRef;

    @Column(name = "payment_url", length = 1024)
    private String paymentUrl;

    @Column(name = "buyer_name", nullable = false, length = 80)
    private String buyerName;

    @Column(name = "buyer_phone", nullable = false, length = 20)
    private String buyerPhone;

    @Column(name = "buyer_email", length = 254)
    private String buyerEmail;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_status", nullable = false, length = 16)
    private PayoutStatus payoutStatus = PayoutStatus.NONE;

    @Column(name = "needs_attention", nullable = false)
    private boolean needsAttention;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    protected ShopOrder() {}

    public ShopOrder(String reference, UUID creatorId, Product product, int quantity, BigDecimal commissionPercent, Commission.Split split,
                     String provider, String buyerName, String buyerPhone, String buyerEmail, String idempotencyKey, Instant now) {
        this.id = UUID.randomUUID();
        this.reference = reference;
        this.creatorId = creatorId;
        this.productId = product.getId();
        this.productTitle = product.getTitle();
        this.quantity = quantity;
        this.unitPriceXof = product.getPriceXof();
        this.amountXof = split.amount();
        this.commissionPercent = commissionPercent;
        this.commissionXof = split.commission();
        this.netXof = split.net();
        this.status = OrderStatus.PENDING;
        this.provider = provider;
        this.buyerName = buyerName;
        this.buyerPhone = buyerPhone;
        this.buyerEmail = buyerEmail;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public UUID getCreatorId() { return creatorId; }
    public UUID getProductId() { return productId; }
    public String getProductTitle() { return productTitle; }
    public int getQuantity() { return quantity; }
    public long getAmountXof() { return amountXof; }
    public long getCommissionXof() { return commissionXof; }
    public long getNetXof() { return netXof; }
    public BigDecimal getCommissionPercent() { return commissionPercent; }
    public String getCurrency() { return currency; }
    public OrderStatus getStatus() { return status; }
    public String getProvider() { return provider; }
    public String getProviderRef() { return providerRef; }
    public String getBuyerName() { return buyerName; }
    public String getBuyerPhone() { return buyerPhone; }
    public String getBuyerEmail() { return buyerEmail; }
    public PayoutStatus getPayoutStatus() { return payoutStatus; }
    public boolean isNeedsAttention() { return needsAttention; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPaidAt() { return paidAt; }

    public String getPaymentUrl() { return paymentUrl; }

    @Override
    public String checkoutDescription() {
        return productTitle + " × " + quantity;
    }

    @Override
    public String buyerName() { return buyerName; }

    @Override
    public String buyerPhone() { return buyerPhone; }

    public void attachPayment(String providerRef, String paymentUrl, Instant now) {
        this.providerRef = providerRef;
        this.paymentUrl = paymentUrl;
        this.updatedAt = now;
    }

    /** Transition d'état : uniquement depuis PENDING (idempotence : un état final ne bouge plus). */
    public boolean transition(OrderStatus to, Instant now) {
        if (status.isFinal() || to == OrderStatus.PENDING) return false;
        this.status = to;
        this.updatedAt = now;
        if (to == OrderStatus.PAID) {
            this.paidAt = now;
            this.payoutStatus = PayoutStatus.PENDING_PAYOUT;
        }
        return true;
    }

    public void flag(Instant now) {
        this.needsAttention = true;
        this.updatedAt = now;
    }

    public void anonymizeBuyer(Instant now) {
        this.buyerName = "Anonyme";
        this.buyerPhone = "00000000";
        this.buyerEmail = null;
        this.updatedAt = now;
    }
}
