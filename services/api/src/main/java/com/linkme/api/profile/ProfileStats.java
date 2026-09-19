package com.linkme.api.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "profile_stats")
public class ProfileStats {
    @Id
    @Column(name = "creator_id")
    private UUID creatorId;

    @Column(nullable = false)
    private long followers;

    @Column(nullable = false)
    private long likes;

    @Column(name = "views_30d", nullable = false)
    private long views30d;

    /** Date de dernière mise à jour déclarée (brief §7.2) */
    @Column(name = "updated_at")
    private Instant updatedAt;

    protected ProfileStats() {}

    public ProfileStats(UUID creatorId) {
        this.creatorId = creatorId;
    }

    public UUID getCreatorId() { return creatorId; }
    public long getFollowers() { return followers; }
    public long getLikes() { return likes; }
    public long getViews30d() { return views30d; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(long followers, long likes, long views30d, Instant now) {
        this.followers = followers;
        this.likes = likes;
        this.views30d = views30d;
        this.updatedAt = now;
    }
}
