package com.linkme.api.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "creator_profile")
public class CreatorProfile {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 30)
    private String handle;

    @Column(name = "display_name", nullable = false, length = 60)
    private String displayName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tagline_lines", nullable = false, columnDefinition = "jsonb")
    private List<String> taglineLines = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> categories = new ArrayList<>();

    @Column(nullable = false, length = 160)
    private String bio = "";

    @Column(name = "background_asset_id")
    private UUID backgroundAssetId;

    @Column(nullable = false, length = 8)
    private String plan = "standard";

    @Column(nullable = false)
    private boolean published;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    /** D44 : abonnement obligatoire pour la visibilité publique — la création/l'édition du profil restent libres. */
    @Column(name = "subscription_status", nullable = false, length = 10)
    private String subscriptionStatus = "inactive";

    @Column(name = "subscription_expires_at")
    private Instant subscriptionExpiresAt;

    @Column(name = "subscription_started_at")
    private Instant subscriptionStartedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CreatorProfile() {}

    public CreatorProfile(UUID userId, String handle, String displayName, Instant now) {
        this.userId = userId;
        this.handle = handle;
        this.displayName = displayName;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getUserId() { return userId; }
    public String getHandle() { return handle; }
    public String getDisplayName() { return displayName; }
    public List<String> getTaglineLines() { return taglineLines == null ? List.of() : taglineLines; }
    public List<String> getCategories() { return categories == null ? List.of() : categories; }
    public String getBio() { return bio == null ? "" : bio; }
    public UUID getBackgroundAssetId() { return backgroundAssetId; }
    public String getPlan() { return plan; }
    public boolean isPublished() { return published; }
    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public boolean isBoutique() { return "boutique".equals(plan); }
    public String getSubscriptionStatus() { return subscriptionStatus; }
    public Instant getSubscriptionExpiresAt() { return subscriptionExpiresAt; }
    public Instant getSubscriptionStartedAt() { return subscriptionStartedAt; }

    /** Visible publiquement seulement si l'abonnement est actif ET que le créateur veut être publié (D44). */
    public boolean isVisible() { return published && "active".equals(subscriptionStatus); }

    /**
     * Un paiement d'abonnement confirmé : le plan choisi devient effectif, l'échéance repart du maximum de
     * {@code maintenant} et de l'échéance en cours (renouveler avant expiration prolonge, ça ne « perd » rien) + la
     * durée de la période payée (D46 : pas de prélèvement récurrent, juste une période à renouveler).
     */
    public void activateSubscription(String plan, int periodDays, Instant now) {
        Instant base = subscriptionExpiresAt != null && subscriptionExpiresAt.isAfter(now) ? subscriptionExpiresAt : now;
        this.plan = plan;
        this.subscriptionStatus = "active";
        this.subscriptionExpiresAt = base.plus(java.time.Duration.ofDays(periodDays));
        if (this.subscriptionStartedAt == null) this.subscriptionStartedAt = now;
        this.updatedAt = now;
    }

    /** Bascule quotidienne (tâche planifiée) : passe « active » à « expired » une fois l'échéance dépassée. */
    public boolean expireIfDue(Instant now) {
        if (!"active".equals(subscriptionStatus) || subscriptionExpiresAt == null || subscriptionExpiresAt.isAfter(now)) return false;
        this.subscriptionStatus = "expired";
        this.updatedAt = now;
        return true;
    }

    public void update(String displayName, List<String> taglineLines, List<String> categories, String bio, UUID backgroundAssetId, Instant now) {
        this.displayName = displayName;
        this.taglineLines = new ArrayList<>(taglineLines);
        this.categories = new ArrayList<>(categories);
        this.bio = bio;
        this.backgroundAssetId = backgroundAssetId;
        this.updatedAt = now;
    }

    public void setPublished(boolean published, Instant now) {
        this.published = published;
        this.updatedAt = now;
    }

    public void setOnboardingCompleted(boolean done, Instant now) {
        this.onboardingCompleted = done;
        this.updatedAt = now;
    }

    public void setPlan(String plan) {
        this.plan = plan;
    }

    /** Suppression de compte : le handle est libéré, la page dépubliée (les commandes gardent la FK). */
    public void anonymize(Instant now) {
        this.handle = "del-" + userId.toString().replace("-", "").substring(0, 12);
        this.displayName = "Compte supprimé";
        this.taglineLines = new ArrayList<>();
        this.categories = new ArrayList<>();
        this.bio = "";
        this.backgroundAssetId = null;
        this.published = false;
        this.subscriptionStatus = "inactive";
        this.subscriptionExpiresAt = null;
        this.updatedAt = now;
    }
}
