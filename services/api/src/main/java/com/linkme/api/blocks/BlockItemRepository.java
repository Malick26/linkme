package com.linkme.api.blocks;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlockItemRepository extends JpaRepository<BlockItem, UUID> {
    List<BlockItem> findByBlockIdOrderByPositionAsc(UUID blockId);

    Optional<BlockItem> findByIdAndBlockId(UUID id, UUID blockId);

    long countByBlockId(UUID blockId);

    @Query("select i.blockId as blockId, count(i) as n from BlockItem i where i.blockId in :ids group by i.blockId")
    List<Object[]> countByBlockIds(@Param("ids") Collection<UUID> ids);
}
