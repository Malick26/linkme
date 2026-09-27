package com.linkme.api.promo;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PromoCodeRepository extends JpaRepository<PromoCode, UUID> {
    Optional<PromoCode> findByCode(String code);

    boolean existsByCode(String code);

    List<PromoCode> findAllByOrderByCreatedAtDesc();

    /** Compteur d'usages incrémenté sous verrou (deux paiements simultanés ne perdent pas d'usage). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PromoCode p where p.id = :id")
    Optional<PromoCode> lock(@Param("id") UUID id);
}
