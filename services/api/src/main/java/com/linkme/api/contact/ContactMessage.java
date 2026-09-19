package com.linkme.api.contact;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contact_message")
public class ContactMessage {
    @Id
    private UUID id;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 254)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ContactMessage() {}

    public ContactMessage(UUID creatorId, String name, String email, String phone, String message, Instant now) {
        this.id = UUID.randomUUID();
        this.creatorId = creatorId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.message = message;
        this.createdAt = now;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
}
