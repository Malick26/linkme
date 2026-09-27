package com.linkme.api.promo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Code promo admin sur les abonnements (D59) : pourcentage de réduction, nombre d'usages, échéance facultative.
 * Un usage n'est compté qu'au paiement effectif ; un code désactivé ne s'applique plus, sans rien effacer.
 */
@Entity
@Table(name = "promo_code")
public class PromoCode {
    @Id
    private UUID id;

    @Column(nullable = false, length = 24)
    private String code;

    @Column(name = "percent_off", nullable = false)
    private int percentOff;

    @Column(name = "max_uses", nullable = false)
    private int maxUses;

    @Column(name = "uses_count", nullable = false)
    private int usesCount;

    @Column(name = "valid_until")
    private Instant validUntil;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PromoCode() {}

    public PromoCode(String code, int percentOff, int maxUses, Instant validUntil, UUID createdBy, Instant now) {
        if (percentOff < 1 || percentOff > 100) throw new IllegalArgumentException("pourcentage");
        if (maxUses < 1) throw new IllegalArgumentException("usages");
        this.id = UUID.randomUUID();
        this.code = normalize(code);
        this.percentOff = percentOff;
        this.maxUses = maxUses;
        this.validUntil = validUntil;
        this.createdBy = createdBy;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(java.util.Locale.ROOT);
    }

    /** Réduction en FCFA entiers, arrondie à l'unité inférieure (en faveur de la plateforme, jamais au-delà du prix). */
    public static long discount(long priceXof, int percentOff) {
        if (priceXof < 0 || percentOff < 0 || percentOff > 100) throw new IllegalArgumentException("prix ou pourcentage");
        return Math.multiplyExact(priceXof, (long) percentOff) / 100L;
    }

    public enum Availability { OK, INACTIVE, EXPIRED, EXHAUSTED }

    public Availability availability(Instant now) {
        if (!active) return Availability.INACTIVE;
        if (validUntil != null && !validUntil.isAfter(now)) return Availability.EXPIRED;
        if (usesCount >= maxUses) return Availability.EXHAUSTED;
        return Availability.OK;
    }

    public void recordUse(Instant now) {
        this.usesCount++;
        this.updatedAt = now;
    }

    public void deactivate(Instant now) {
        this.active = false;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public int getPercentOff() { return percentOff; }
    public int getMaxUses() { return maxUses; }
    public int getUsesCount() { return usesCount; }
    public Instant getValidUntil() { return validUntil; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
