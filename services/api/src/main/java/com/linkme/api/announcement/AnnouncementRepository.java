package com.linkme.api.announcement;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {
    List<Announcement> findAllByOrderByCreatedAtDesc();

    /** Candidates en ligne, la plus récemment commencée d'abord (la page n'en affiche qu'une). */
    @Query("select a from Announcement a where a.active = true and a.startsAt <= :now and (a.endsAt is null or a.endsAt > :now) "
            + "order by a.startsAt desc, a.createdAt desc")
    List<Announcement> live(@Param("now") Instant now);
}
