package com.linkme.api.shop;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "product")
public class Product {
    @Id
    private UUID id;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(name = "price_xof", nullable = false)
    private long priceXof;

    @Column(nullable = false, length = 2000)
    private String description = "";

    private Integer stock;

    @Column(nullable = false)
    private boolean active = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "image_ids", nullable = false, columnDefinition = "jsonb")
    private List<String> imageIds = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    private long version;

    protected Product() {}

    public Product(UUID creatorId, Instant now) {
        this.id = UUID.randomUUID();
        this.creatorId = creatorId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getCreatorId() { return creatorId; }
    public String getTitle() { return title; }
    public long getPriceXof() { return priceXof; }
    public String getDescription() { return description; }
    public Integer getStock() { return stock; }
    public boolean isActive() { return active; }
    public List<String> getImageIds() { return imageIds == null ? List.of() : imageIds; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeletedAt() { return deletedAt; }

    public boolean available(int quantity) {
        return active && deletedAt == null && (stock == null || stock >= quantity);
    }

    public void update(String title, long priceXof, String description, Integer stock, boolean active, List<String> imageIds, Instant now) {
        this.title = title;
        this.priceXof = priceXof;
        this.description = description == null ? "" : description;
        this.stock = stock;
        this.active = active;
        this.imageIds = new ArrayList<>(imageIds);
        this.updatedAt = now;
    }

    /** Décrémente le stock au paiement. @return false si le stock est insuffisant (commande à traiter manuellement). */
    public boolean decrementStock(int quantity, Instant now) {
        if (stock == null) return true;
        if (stock < quantity) return false;
        stock -= quantity;
        updatedAt = now;
        return true;
    }

    public void softDelete(Instant now) {
        this.deletedAt = now;
        this.active = false;
        this.updatedAt = now;
    }
}
