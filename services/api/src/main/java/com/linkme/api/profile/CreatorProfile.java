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
    private String plan = "free";

    @Column(nullable = false)
    private boolean published;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

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
    public boolean isPro() { return "pro".equals(plan); }

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
        this.updatedAt = now;
    }
}
