package com.linkme.api.referral;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReferralEarningRepository extends JpaRepository<ReferralEarning, UUID> {
    boolean existsBySubscriptionPaymentId(UUID subscriptionPaymentId);

    List<ReferralEarning> findByReferrerIdOrderByCreatedAtDesc(UUID referrerId, Pageable pageable);

    List<ReferralEarning> findByReferrerId(UUID referrerId);

    long countByReferrerIdAndBlockedReasonIsNotNull(UUID referrerId);

    @Query("select coalesce(sum(e.amountXof), 0) from ReferralEarning e where e.referrerId = :referrerId and e.blockedReason is null")
    long sumCredited(@Param("referrerId") UUID referrerId);
}
