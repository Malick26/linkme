package com.linkme.api.subscription;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, UUID> {
    Optional<SubscriptionPayment> findByReference(String reference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from SubscriptionPayment p where p.reference = :reference")
    Optional<SubscriptionPayment> lockByReference(@Param("reference") String reference);

    Optional<SubscriptionPayment> findByCreatorIdAndIdempotencyKey(UUID creatorId, String idempotencyKey);

    Page<SubscriptionPayment> findByCreatorIdOrderByCreatedAtDesc(UUID creatorId, Pageable pageable);

    List<SubscriptionPayment> findByCreatorId(UUID creatorId);
}
