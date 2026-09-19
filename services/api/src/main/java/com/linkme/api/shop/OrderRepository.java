package com.linkme.api.shop;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<ShopOrder, UUID> {
    Optional<ShopOrder> findByReference(String reference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ShopOrder o where o.reference = :reference")
    Optional<ShopOrder> lockByReference(@Param("reference") String reference);

    Optional<ShopOrder> findByCreatorIdAndIdempotencyKey(UUID creatorId, String idempotencyKey);

    Page<ShopOrder> findByCreatorIdOrderByCreatedAtDesc(UUID creatorId, Pageable pageable);

    Page<ShopOrder> findByCreatorIdAndStatusOrderByCreatedAtDesc(UUID creatorId, OrderStatus status, Pageable pageable);

    List<ShopOrder> findByCreatorIdAndStatus(UUID creatorId, OrderStatus status);

    @Query("select o from ShopOrder o where o.creatorId = :creatorId and o.status = com.linkme.api.shop.OrderStatus.PAID and o.paidAt >= :since")
    List<ShopOrder> paidSince(@Param("creatorId") UUID creatorId, @Param("since") Instant since);

    List<ShopOrder> findByCreatorId(UUID creatorId);
}
