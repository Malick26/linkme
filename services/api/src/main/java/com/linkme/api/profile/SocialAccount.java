package com.linkme.api.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "social_account")
public class SocialAccount {
    @Id
    private UUID id;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(nullable = false, length = 16)
    private String platform;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "followers_count", nullable = false)
    private long followersCount;

    @Column(nullable = false)
    private int position;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SocialAccount() {}

    public SocialAccount(UUID creatorId, String platform, String url, long followersCount, int position, Instant now) {
        this.id = UUID.randomUUID();
        this.creatorId = creatorId;
        this.platform = platform;
        this.url = url;
        this.followersCount = followersCount;
        this.position = position;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getCreatorId() { return creatorId; }
    public String getPlatform() { return platform; }
    public String getUrl() { return url; }
    public long getFollowersCount() { return followersCount; }
    public int getPosition() { return position; }
    public Instant getUpdatedAt() { return updatedAt; }
}
