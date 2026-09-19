package com.linkme.api.shop;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    @Query("select p from Product p where p.creatorId = :creatorId and p.deletedAt is null order by p.createdAt desc")
    List<Product> findLive(@Param("creatorId") UUID creatorId);

    @Query("select p from Product p where p.id = :id and p.creatorId = :creatorId and p.deletedAt is null")
    Optional<Product> findLive(@Param("id") UUID id, @Param("creatorId") UUID creatorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> lockById(@Param("id") UUID id);

    long countByCreatorIdAndDeletedAtIsNull(UUID creatorId);
}
