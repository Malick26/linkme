package com.linkme.api.uploads;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetRepository extends JpaRepository<Asset, UUID> {
    List<Asset> findByIdIn(Collection<UUID> ids);

    @Modifying
    @Query("delete from Asset a where a.ownerId = :ownerId")
    void deleteAllByOwner(@Param("ownerId") UUID ownerId);
}
