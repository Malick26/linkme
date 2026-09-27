package com.linkme.api.crm;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CrmContactLogRepository extends JpaRepository<CrmContactLog, UUID> {
    interface LastContact {
        UUID getContactId();
        Instant getLastAt();
    }

    @Query("select l.contactId as contactId, max(l.createdAt) as lastAt from CrmContactLog l "
            + "where l.contactKind = :kind and l.contactId in :ids group by l.contactId")
    List<LastContact> lastContacts(@Param("kind") String kind, @Param("ids") Collection<UUID> ids);
}
