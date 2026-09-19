package com.linkme.api.payments;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
    List<LedgerEntry> findByOrderId(UUID orderId);

    List<LedgerEntry> findByCreatorId(UUID creatorId);
}
