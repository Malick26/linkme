package com.linkme.api.crm;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Prospect inscrit sur /rejoindre (D61) : consentement horodaté, désinscription à tout moment. */
@Entity
@Table(name = "prospect")
public class Prospect {
    @Id
    private UUID id;

    @Column(length = 60)
    private String name;

    @Column(length = 254)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(name = "consent_at", nullable = false)
    private Instant consentAt;

    @Column(name = "unsubscribed_at")
    private Instant unsubscribedAt;

    @Column(name = "unsubscribe_token", nullable = false, length = 64)
    private String unsubscribeToken;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Prospect() {}

    public Prospect(String name, String email, String phone, String unsubscribeToken, String ipHash, Instant now) {
        if (email == null && phone == null) throw new IllegalArgumentException("injoignable");
        this.id = UUID.randomUUID();
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.unsubscribeToken = unsubscribeToken;
        this.ipHash = ipHash;
        this.consentAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Réinscription d'un contact déjà connu : complète les coordonnées manquantes et renouvelle le consentement. */
    public void rejoin(String name, String email, String phone, Instant now) {
        if (this.name == null && name != null) this.name = name;
        if (this.email == null && email != null) this.email = email;
        if (this.phone == null && phone != null) this.phone = phone;
        this.consentAt = now;
        this.unsubscribedAt = null;
        this.updatedAt = now;
    }

    public void unsubscribe(Instant now) {
        if (unsubscribedAt == null) unsubscribedAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public Instant getUnsubscribedAt() { return unsubscribedAt; }
    public String getUnsubscribeToken() { return unsubscribeToken; }
    public Instant getCreatedAt() { return createdAt; }
}
