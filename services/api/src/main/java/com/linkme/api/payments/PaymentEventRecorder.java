package com.linkme.api.payments;

import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Journalisation hors transaction principale (les rejets — signature invalide… — doivent être tracés même si on lève une erreur). */
@Component
public class PaymentEventRecorder {
    private final PaymentEventRepository events;
    private final Clock clock;

    public PaymentEventRecorder(PaymentEventRepository events, Clock clock) {
        this.events = events;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRejected(String provider, String eventId, String reference, String type, Map<String, Object> payload, boolean sigValid, String result) {
        if (events.existsByProviderAndEventId(provider, eventId)) return;
        events.save(new PaymentEvent(provider, eventId, reference, type, payload, sigValid, result, clock.instant()));
    }
}
