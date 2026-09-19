package com.linkme.api.uploads;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Image appartenant à un créateur : Cloudinary (prod), locale (dev) ou seed (démo). */
@Entity
@Table(name = "asset")
public class Asset {
    @Id
    private UUID id;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "public_id", nullable = false)
    private String publicId;

    @Column(nullable = false, length = 16)
    private String kind;

    private Integer width;
    private Integer height;

    @Column(length = 10)
    private String format;

    private Integer bytes;

    private String placeholder;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Asset() {}

    public Asset(UUID ownerId, String provider, String publicId, String kind, Integer width, Integer height, String format,
                 Integer bytes, String placeholder, Instant now) {
        this.id = UUID.randomUUID();
        this.ownerId = ownerId;
        this.provider = provider;
        this.publicId = publicId;
        this.kind = kind;
        this.width = width;
        this.height = height;
        this.format = format;
        this.bytes = bytes;
        this.placeholder = placeholder;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getProvider() { return provider; }
    public String getPublicId() { return publicId; }
    public String getKind() { return kind; }
    public Integer getWidth() { return width; }
    public Integer getHeight() { return height; }
    public String getPlaceholder() { return placeholder; }
}
