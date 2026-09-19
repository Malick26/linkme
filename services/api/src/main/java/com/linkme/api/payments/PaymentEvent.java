package com.linkme.api.payments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Journal append-only des notifications de paiement (immuable en base : trigger + {@link Immutable}). */
@Entity
@Immutable
@Table(name = "payment_event")
public class PaymentEvent {
    @Id
    private UUID id;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "event_id", nullable = false, length = 160)
    private String eventId;

    @Column(name = "order_reference", length = 15)
    private String orderReference;

    @Column(nullable = false, length = 32)
    private String type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "signature_valid", nullable = false)
    private boolean signatureValid;

    @Column(nullable = false, length = 32)
    private String result;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    protected PaymentEvent() {}

    public PaymentEvent(String provider, String eventId, String orderReference, String type, Map<String, Object> payload,
                        boolean signatureValid, String result, Instant now) {
        this.id = UUID.randomUUID();
        this.provider = provider;
        this.eventId = eventId;
        this.orderReference = orderReference != null && orderReference.length() <= 15 ? orderReference : null;
        this.type = type == null ? "unknown" : type.substring(0, Math.min(32, type.length()));
        this.payload = payload;
        this.signatureValid = signatureValid;
        this.result = result;
        this.receivedAt = now;
    }

    public String getResult() { return result; }
    public String getOrderReference() { return orderReference; }
    public boolean isSignatureValid() { return signatureValid; }
}
