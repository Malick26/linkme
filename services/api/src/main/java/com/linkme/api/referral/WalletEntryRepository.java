package com.linkme.api.referral;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletEntryRepository extends JpaRepository<WalletEntry, UUID> {
    /** Solde retirable : toutes les écritures déjà disponibles (gains dégelés, retraits réservés, recrédits). */
    @Query("select coalesce(sum(w.amountXof), 0) from WalletEntry w where w.userId = :userId and w.availableAt <= :now")
    long availableBalance(@Param("userId") UUID userId, @Param("now") Instant now);

    /** Gains encore gelés (délai anti-fraude de 7 jours, D54). */
    @Query("select coalesce(sum(w.amountXof), 0) from WalletEntry w where w.userId = :userId and w.kind = 'REFERRAL_EARNING' and w.availableAt > :now")
    long heldBalance(@Param("userId") UUID userId, @Param("now") Instant now);

    @Query("select min(w.availableAt) from WalletEntry w where w.userId = :userId and w.kind = 'REFERRAL_EARNING' and w.availableAt > :now")
    Instant nextRelease(@Param("userId") UUID userId, @Param("now") Instant now);
}
