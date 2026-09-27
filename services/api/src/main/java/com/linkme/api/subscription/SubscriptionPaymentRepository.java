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

    /** Un créateur n'utilise un même code promo qu'une fois (paiement en attente ou réussi, D59). */
    @Query("select count(p) > 0 from SubscriptionPayment p where p.creatorId = :creatorId and p.promoCodeId = :promoId and p.status in ("
            + "com.linkme.api.subscription.SubscriptionPaymentStatus.PENDING, com.linkme.api.subscription.SubscriptionPaymentStatus.PAID)")
    boolean existsActiveUseOfPromo(@Param("creatorId") UUID creatorId, @Param("promoId") UUID promoId);

    /** Anti-fraude (D54) : ce numéro a-t-il déjà servi à payer l'abonnement de ce créateur ? */
    boolean existsByCreatorIdAndPayerPhone(UUID creatorId, String payerPhone);

    /** Rattrapage (D51) : paiements PAID de filleuls sans gain de parrainage correspondant. */
    @Query("""
            select p.id from SubscriptionPayment p, Referral r
            where r.refereeId = p.creatorId and p.status = :status and p.paidAt >= :since
              and not exists (select 1 from ReferralEarning e where e.subscriptionPaymentId = p.id)""")
    List<UUID> findPaidWithoutReferralEarning(@Param("status") SubscriptionPaymentStatus status, @Param("since") java.time.Instant since);
}
