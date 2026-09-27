package com.linkme.api.profile;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreatorProfileRepository extends JpaRepository<CreatorProfile, UUID> {
    Optional<CreatorProfile> findByHandle(String handle);

    boolean existsByHandle(String handle);

    /** Segments du CRM (D63). */
    List<CreatorProfile> findBySubscriptionStatus(String subscriptionStatus);

    /** Bascule quotidienne « active » → « expired » (D46) : abonnements dont l'échéance est dépassée. */
    List<CreatorProfile> findBySubscriptionStatusAndSubscriptionExpiresAtBefore(String subscriptionStatus, Instant instant);
}
