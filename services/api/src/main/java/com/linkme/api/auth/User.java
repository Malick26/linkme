package com.linkme.api.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id
    private UUID id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    /** Utilisé pour le paiement d'abonnement (CinetPay l'exige) et les rappels de renouvellement (WhatsApp/email). */
    @Column(length = 20)
    private String phone;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected User() {}

    public User(UUID id, String email, String passwordHash, Instant now) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getPhone() { return phone; }
    public Instant getDeletedAt() { return deletedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void changePassword(String hash, Instant now) {
        this.passwordHash = hash;
        this.updatedAt = now;
    }

    public void setPhone(String phone, Instant now) {
        this.phone = phone;
        this.updatedAt = now;
    }

    /** Suppression de compte : l'email est anonymisé (libère l'adresse), le mot de passe invalidé. */
    public void markDeleted(Instant now) {
        this.deletedAt = now;
        this.email = "deleted-" + id + "@invalid.local";
        this.passwordHash = "!";
        this.phone = null;
        this.updatedAt = now;
    }
}
