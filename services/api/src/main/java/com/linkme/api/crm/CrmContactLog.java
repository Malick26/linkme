package com.linkme.api.crm;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/** Trace d'une relance (email envoyé, WhatsApp ouvert depuis le CRM) — sert à « dernier contact » (D63). */
@Entity
@Immutable
@Table(name = "crm_contact_log")
public class CrmContactLog {
    @Id
    private UUID id;

    @Column(name = "contact_kind", nullable = false, length = 10)
    private String contactKind;

    @Column(name = "contact_id", nullable = false)
    private UUID contactId;

    @Column(nullable = false, length = 10)
    private String channel;

    @Column(name = "admin_id")
    private UUID adminId;

    @Column(length = 150)
    private String subject;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CrmContactLog() {}

    public CrmContactLog(String contactKind, UUID contactId, String channel, UUID adminId, String subject, Instant now) {
        this.id = UUID.randomUUID();
        this.contactKind = contactKind;
        this.contactId = contactId;
        this.channel = channel;
        this.adminId = adminId;
        this.subject = subject;
        this.createdAt = now;
    }

    public UUID getContactId() { return contactId; }
    public String getContactKind() { return contactKind; }
    public Instant getCreatedAt() { return createdAt; }
}
