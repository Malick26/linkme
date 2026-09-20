package com.linkme.api.payments;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.payments.PaymentProvider.PaymentStatus;
import com.linkme.api.payments.PaymentProvider.VerifiedPayment;
import com.linkme.api.payments.PaymentProvider.WebhookNotification;
import com.linkme.api.payments.PaymentProvider.WebhookRequest;
import com.linkme.api.shop.OrderRepository;
import com.linkme.api.shop.OrderStatus;
import com.linkme.api.shop.Product;
import com.linkme.api.shop.ProductRepository;
import com.linkme.api.shop.ShopOrder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Traitement des notifications de paiement (ADR 0005, D24) :
 * signature → idempotence → re-vérification serveur-à-serveur → contrôle montant/devise → transition d'état →
 * stock → grand livre → emails (après commit). Chaque notification est journalisée (append-only).
 */
@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

    public enum Outcome { PROCESSED, DUPLICATE, ALREADY_FINAL, PENDING, AMOUNT_MISMATCH }

    private final PaymentProviderRegistry registry;
    private final PaymentEventRepository events;
    private final PaymentEventRecorder recorder;
    private final OrderRepository orders;
    private final ProductRepository products;
    private final LedgerEntryRepository ledger;
    private final ApplicationEventPublisher publisher;
    private final ObjectMapper mapper;
    private final Clock clock;

    public PaymentService(PaymentProviderRegistry registry, PaymentEventRepository events, PaymentEventRecorder recorder, OrderRepository orders,
                          ProductRepository products, LedgerEntryRepository ledger, ApplicationEventPublisher publisher, ObjectMapper mapper, Clock clock) {
        this.registry = registry;
        this.events = events;
        this.recorder = recorder;
        this.orders = orders;
        this.products = products;
        this.ledger = ledger;
        this.publisher = publisher;
        this.mapper = mapper;
        this.clock = clock;
    }

    /** Événement publié quand une commande passe à PAID (emails après commit). */
    public record OrderPaid(String reference) {}

    @Transactional
    public Outcome handleWebhook(String providerId, WebhookRequest req) {
        PaymentProvider provider = registry.forWebhook(providerId);
        WebhookNotification n = provider.parseWebhook(req);
        Map<String, Object> payload = safePayload(req);
        String bodyHash = Hashing.sha256Hex(new String(req.body(), StandardCharsets.UTF_8));
        String eventId = n.eventId() != null && !n.eventId().isBlank() ? n.eventId() : "sha256:" + bodyHash;

        // La signature est vérifiée AVANT toute utilisation de l'identifiant d'événement : sinon une notification
        // forgée pourrait « réserver » l'event_id de la vraie notification et la faire passer pour un doublon.
        if (!n.signatureValid()) {
            recorder.recordRejected(providerId, "rejected:" + bodyHash, n.reference(), n.type(), payload, false, "INVALID_SIGNATURE");
            log.warn("Webhook {} rejeté : signature invalide (ref={})", providerId, n.reference());
            throw ApiException.unauthorized("INVALID_SIGNATURE", "Signature invalide.");
        }

        if (events.existsByProviderAndEventId(providerId, eventId)) return Outcome.DUPLICATE;
        Optional<ShopOrder> maybe = n.reference() == null ? Optional.empty() : orders.lockByReference(n.reference());
        if (maybe.isEmpty() || !maybe.get().getProvider().equals(providerId)) {
            recorder.recordRejected(providerId, eventId, n.reference(), n.type(), payload, true, "UNKNOWN_ORDER");
            throw ApiException.badRequest("UNKNOWN_ORDER", "Commande inconnue.");
        }
        ShopOrder order = maybe.get();
        Instant now = clock.instant();

        if (order.getStatus().isFinal()) {
            events.save(new PaymentEvent(providerId, eventId, order.getReference(), n.type(), payload, true, "ALREADY_FINAL", now));
            return Outcome.ALREADY_FINAL;
        }

        VerifiedPayment v = provider.verify(order);
        if (v.status() == PaymentStatus.PAID) {
            boolean amountOk = v.amount() != null && v.amount() == order.getAmountXof() && "XOF".equalsIgnoreCase(v.currency())
                    && (n.claimedAmount() == null || n.claimedAmount() == order.getAmountXof());
            if (!amountOk) {
                // on ne lève pas d'exception : le signalement de la commande et la trace doivent être commités
                order.flag(now);
                events.save(new PaymentEvent(providerId, eventId, order.getReference(), n.type(), payload, true, "AMOUNT_MISMATCH", now));
                log.error("Paiement {} : montant incohérent (attendu {}, vérifié {}, annoncé {})", order.getReference(), order.getAmountXof(), v.amount(), n.claimedAmount());
                return Outcome.AMOUNT_MISMATCH;
            }
            markPaid(order, now);
            events.save(new PaymentEvent(providerId, eventId, order.getReference(), n.type(), payload, true, "PAID", now));
            publisher.publishEvent(new OrderPaid(order.getReference()));
            return Outcome.PROCESSED;
        }
        if (v.status() == PaymentStatus.FAILED || v.status() == PaymentStatus.CANCELED) {
            order.transition(v.status() == PaymentStatus.FAILED ? OrderStatus.FAILED : OrderStatus.CANCELED, now);
            events.save(new PaymentEvent(providerId, eventId, order.getReference(), n.type(), payload, true, v.status().name(), now));
            return Outcome.PROCESSED;
        }
        events.save(new PaymentEvent(providerId, eventId, order.getReference(), n.type(), payload, true, "PENDING", now));
        return Outcome.PENDING;
    }

    private void markPaid(ShopOrder order, Instant now) {
        if (!order.transition(OrderStatus.PAID, now)) return;
        Product p = products.lockById(order.getProductId()).orElse(null);
        if (p == null || !p.decrementStock(order.getQuantity(), now)) {
            // payé mais stock épuisé entre-temps : à traiter manuellement (remboursement / réassort)
            order.flag(now);
        }
        ledger.save(new LedgerEntry(order.getCreatorId(), order.getId(), LedgerEntry.Kind.SALE_GROSS, order.getAmountXof(), now));
        ledger.save(new LedgerEntry(order.getCreatorId(), order.getId(), LedgerEntry.Kind.COMMISSION, -order.getCommissionXof(), now));
        ledger.save(new LedgerEntry(order.getCreatorId(), order.getId(), LedgerEntry.Kind.CREATOR_NET, order.getNetXof(), now));
    }

    private Map<String, Object> safePayload(WebhookRequest req) {
        Map<String, Object> out = new HashMap<>();
        if (req.form() != null && !req.form().isEmpty()) {
            out.putAll(req.form());
            return redact(out);
        }
        try {
            return redact(mapper.readValue(req.body(), MAP));
        } catch (Exception e) {
            out.put("raw", new String(req.body(), StandardCharsets.UTF_8));
            return out;
        }
    }

    /** Utilitaire : les payloads journalisés ne doivent pas contenir de secret (ex. hash de clé PayDunya). */
    static Map<String, Object> redact(Map<String, Object> m) {
        Map<String, Object> copy = new HashMap<>(m);
        copy.keySet().removeIf(k -> k.toLowerCase().contains("hash") || k.toLowerCase().contains("token") || k.toLowerCase().contains("key"));
        return copy;
    }
}
