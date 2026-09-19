package com.linkme.api.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Événement de trafic anonyme (D22) : aucune IP stockée, empreinte journalière non réversible. */
@Entity
@Table(name = "analytics_event")
public class AnalyticsEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(nullable = false, length = 16)
    private String type;

    @Column(name = "block_id")
    private UUID blockId;

    @Column(length = 64)
    private String target;

    @Column(name = "referrer_host", length = 255)
    private String referrerHost;

    @Column(name = "visitor_hash", nullable = false, length = 16)
    private String visitorHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AnalyticsEvent() {}

    public AnalyticsEvent(UUID creatorId, String type, UUID blockId, String target, String referrerHost, String visitorHash, Instant now) {
        this.creatorId = creatorId;
        this.type = type;
        this.blockId = blockId;
        this.target = target;
        this.referrerHost = referrerHost;
        this.visitorHash = visitorHash;
        this.createdAt = now;
    }
}
