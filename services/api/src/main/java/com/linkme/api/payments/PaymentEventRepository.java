package com.linkme.api.payments;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, UUID> {
    boolean existsByProviderAndEventId(String provider, String eventId);

    List<PaymentEvent> findByOrderReference(String orderReference);
}
