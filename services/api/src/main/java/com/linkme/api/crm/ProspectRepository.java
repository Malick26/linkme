package com.linkme.api.crm;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProspectRepository extends JpaRepository<Prospect, UUID> {
    @Query("select p from Prospect p where lower(p.email) = lower(:email)")
    Optional<Prospect> findByEmailIgnoreCase(@Param("email") String email);

    Optional<Prospect> findByPhone(String phone);

    Optional<Prospect> findByUnsubscribeToken(String token);

    List<Prospect> findAllByOrderByCreatedAtDesc();
}
