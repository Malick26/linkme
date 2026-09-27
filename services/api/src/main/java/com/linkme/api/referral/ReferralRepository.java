package com.linkme.api.referral;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReferralRepository extends JpaRepository<Referral, UUID> {
    List<Referral> findByReferrerIdOrderByCreatedAtDesc(UUID referrerId);

    long countByReferrerId(UUID referrerId);

    /**
     * Signal anti-fraude (D54) : filleuls de ce parrain qui partagent l'empreinte IP du jour d'un AUTRE filleul du même
     * parrain (l'empreinte est salée par jour : même valeur = même IP, même jour).
     */
    @Query("""
            select count(r) from Referral r where r.referrerId = :referrerId and r.signupIpHash is not null
              and exists (select 1 from Referral o where o.referrerId = :referrerId and o.refereeId <> r.refereeId
                          and o.signupIpHash = r.signupIpHash)""")
    long countSameDayIpReferrals(@Param("referrerId") UUID referrerId);
}
