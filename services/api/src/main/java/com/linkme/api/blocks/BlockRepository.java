package com.linkme.api.blocks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlockRepository extends JpaRepository<Block, UUID> {
    List<Block> findByCreatorIdOrderByPositionAsc(UUID creatorId);

    Optional<Block> findByIdAndCreatorId(UUID id, UUID creatorId);

    Optional<Block> findByCreatorIdAndSlug(UUID creatorId, String slug);

    boolean existsByCreatorIdAndSlug(UUID creatorId, String slug);

    long countByCreatorId(UUID creatorId);

    @Modifying
    @Query("delete from Block b where b.creatorId = :creatorId")
    void deleteAllByCreator(@Param("creatorId") UUID creatorId);
}
