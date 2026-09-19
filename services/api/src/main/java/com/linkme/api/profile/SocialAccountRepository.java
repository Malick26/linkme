package com.linkme.api.profile;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, UUID> {
    List<SocialAccount> findByCreatorIdOrderByPositionAsc(UUID creatorId);

    @Modifying
    @Query("delete from SocialAccount s where s.creatorId = :creatorId")
    void deleteAllByCreator(@Param("creatorId") UUID creatorId);
}
