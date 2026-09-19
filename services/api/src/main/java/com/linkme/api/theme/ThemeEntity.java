package com.linkme.api.theme;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Brouillon et version publiée du thème (jsonb). */
@Entity
@Table(name = "theme")
public class ThemeEntity {
    @Id
    @Column(name = "creator_id")
    private UUID creatorId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> draft;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> published;

    @Column(nullable = false)
    private int version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    protected ThemeEntity() {}

    public ThemeEntity(UUID creatorId, Map<String, Object> draft, Instant now) {
        this.creatorId = creatorId;
        this.draft = draft;
        this.updatedAt = now;
    }

    public UUID getCreatorId() { return creatorId; }
    public Map<String, Object> getDraft() { return draft; }
    public Map<String, Object> getPublished() { return published; }
    public int getVersion() { return version; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPublishedAt() { return publishedAt; }

    public void saveDraft(Map<String, Object> draft, Instant now) {
        this.draft = draft;
        this.updatedAt = now;
    }

    public void publish(Instant now) {
        this.published = draft;
        this.version++;
        this.publishedAt = now;
        this.updatedAt = now;
    }
}
