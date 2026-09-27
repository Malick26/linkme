package com.linkme.api.referral;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReferralAccountRepository extends JpaRepository<ReferralAccount, UUID> {
    Optional<ReferralAccount> findByCode(String code);

    boolean existsByCode(String code);

    /** Collabs négociées, en cours ou expirées (D64). */
    java.util.List<ReferralAccount> findByCollabRateBpsIsNotNullOrderByCollabExpiresAtDesc();

    /** Verrou par créateur : sérialise les demandes de retrait concurrentes (pas de double dépense). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from ReferralAccount a where a.userId = :userId")
    Optional<ReferralAccount> lock(@Param("userId") UUID userId);
}
