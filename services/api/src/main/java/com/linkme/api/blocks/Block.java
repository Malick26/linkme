package com.linkme.api.blocks;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "block")
public class Block {
    @Id
    private UUID id;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(nullable = false, length = 16)
    private String type;

    @Column(nullable = false, length = 40)
    private String slug;

    @Column(nullable = false, length = 40)
    private String title;

    @Column(nullable = false, length = 80)
    private String subtitle = "";

    @Column(length = 24)
    private String icon;

    @Column(name = "thumbnail_asset_id")
    private UUID thumbnailAssetId;

    @Column(name = "background_asset_id")
    private UUID backgroundAssetId;

    @Column(length = 2048)
    private String url;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean visible = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> config = new HashMap<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Block() {}

    public Block(UUID creatorId, String type, String slug, int position, Instant now) {
        this.id = UUID.randomUUID();
        this.creatorId = creatorId;
        this.type = type;
        this.slug = slug;
        this.position = position;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getCreatorId() { return creatorId; }
    public String getType() { return type; }
    public String getSlug() { return slug; }
    public String getTitle() { return title; }
    public String getSubtitle() { return subtitle; }
    public String getIcon() { return icon; }
    public UUID getThumbnailAssetId() { return thumbnailAssetId; }
    public UUID getBackgroundAssetId() { return backgroundAssetId; }
    public String getUrl() { return url; }
    public int getPosition() { return position; }
    public boolean isVisible() { return visible; }
    public Map<String, Object> getConfig() { return config == null ? Map.of() : config; }

    public void update(String title, String subtitle, String icon, UUID thumbnailAssetId, UUID backgroundAssetId, String url,
                       boolean visible, Map<String, Object> config, Instant now) {
        this.title = title;
        this.subtitle = subtitle == null ? "" : subtitle;
        this.icon = icon;
        this.thumbnailAssetId = thumbnailAssetId;
        this.backgroundAssetId = backgroundAssetId;
        this.url = url;
        this.visible = visible;
        this.config = config == null ? new HashMap<>() : new HashMap<>(config);
        this.updatedAt = now;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
