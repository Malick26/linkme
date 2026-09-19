package com.linkme.api.blocks;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "block_item")
public class BlockItem {
    @Id
    private UUID id;

    @Column(name = "block_id", nullable = false)
    private UUID blockId;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(nullable = false, length = 500)
    private String description = "";

    @Column(length = 2048)
    private String url;

    @Column(name = "image_asset_id")
    private UUID imageAssetId;

    @Column(nullable = false)
    private int position;

    protected BlockItem() {}

    public BlockItem(UUID blockId, int position) {
        this.id = UUID.randomUUID();
        this.blockId = blockId;
        this.position = position;
    }

    public UUID getId() { return id; }
    public UUID getBlockId() { return blockId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getUrl() { return url; }
    public UUID getImageAssetId() { return imageAssetId; }
    public int getPosition() { return position; }

    public void update(String title, String description, String url, UUID imageAssetId) {
        this.title = title;
        this.description = description == null ? "" : description;
        this.url = url;
        this.imageAssetId = imageAssetId;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
