package com.linkme.api.announcement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/** Annonce affichée en pop-up sur l'accueil et/ou le tableau de bord des créateurs (D65). */
@Entity
@Table(name = "announcement")
public class Announcement {
    public static final Set<String> AUDIENCES = Set.of("landing", "dashboard", "both");

    @Id
    private UUID id;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(nullable = false, length = 500)
    private String body;

    @Column(name = "cta_label", length = 40)
    private String ctaLabel;

    @Column(name = "cta_url", length = 500)
    private String ctaUrl;

    @Column(nullable = false, length = 10)
    private String audience;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Announcement() {}

    public Announcement(UUID createdBy, Instant now) {
        this.id = UUID.randomUUID();
        this.createdBy = createdBy;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void apply(String title, String body, String ctaLabel, String ctaUrl, String audience, Instant startsAt, Instant endsAt, boolean active,
                      Instant now) {
        if (!AUDIENCES.contains(audience)) throw new IllegalArgumentException("audience");
        if ((ctaLabel == null) != (ctaUrl == null)) throw new IllegalArgumentException("bouton incomplet");
        if (endsAt != null && !endsAt.isAfter(startsAt)) throw new IllegalArgumentException("période");
        this.title = title;
        this.body = body;
        this.ctaLabel = ctaLabel;
        this.ctaUrl = ctaUrl;
        this.audience = audience;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.active = active;
        this.updatedAt = now;
    }

    /** En ligne : active, commencée, pas terminée. */
    public boolean live(Instant now) {
        return active && !startsAt.isAfter(now) && (endsAt == null || endsAt.isAfter(now));
    }

    /** Visible pour ce public (« both » vaut pour l'accueil et le tableau de bord). */
    public boolean targets(String where) {
        return audience.equals(where) || "both".equals(audience);
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getCtaLabel() { return ctaLabel; }
    public String getCtaUrl() { return ctaUrl; }
    public String getAudience() { return audience; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
