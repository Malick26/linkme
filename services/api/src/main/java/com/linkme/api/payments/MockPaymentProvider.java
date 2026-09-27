package com.linkme.api.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linkme.api.common.Hashing;
import com.linkme.api.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Fournisseur simulé (dev/tests, D9) : page de paiement factice, webhooks signés HMAC-SHA256 (en-tête
 * {@code X-Mock-Signature}), « API de vérification » en mémoire. Jamais actif en production (profil prod).
 */
@Component
public class MockPaymentProvider implements PaymentProvider {
    public static final String SIGNATURE_HEADER = "x-mock-signature";
    private final AppProperties props;
    private final ObjectMapper mapper;
    /** État « côté fournisseur » : montant réellement encaissé et statut par référence. */
    private final Map<String, Charge> charges = new ConcurrentHashMap<>();

    record Charge(long amount, PaymentStatus status) {}

    public MockPaymentProvider(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    @Override
    public String id() {
        return "mock";
    }

    @Override
    public boolean enabled() {
        AppProperties.Mock m = props.payments().mock();
        return m != null && m.enabled() && m.webhookSecret() != null && !m.webhookSecret().isBlank();
    }

    @Override
    public PaymentInit initiate(Payable payable, PaymentUrls urls) {
        charges.put(payable.getReference(), new Charge(payable.getAmountXof(), PaymentStatus.PENDING));
        String path = payable.getReference().startsWith("SB-") ? "/api/payments/mock/subscription/" : "/api/payments/mock/";
        return new PaymentInit(path + payable.getReference(), "MOCK-" + payable.getReference());
    }

    /** Simule l'issue côté fournisseur et renvoie la notification signée qu'il enverrait. */
    public WebhookRequest settle(String reference, PaymentStatus outcome) {
        Charge c = charges.getOrDefault(reference, new Charge(0, PaymentStatus.PENDING));
        charges.put(reference, new Charge(c.amount(), outcome));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event_id", "evt_" + UUID.randomUUID());
        payload.put("reference", reference);
        payload.put("status", outcome.name());
        payload.put("amount", c.amount());
        payload.put("currency", "XOF");
        return signed(payload);
    }

    /** Construit une requête signée (utilisé aussi par les tests pour rejouer / altérer). */
    public WebhookRequest signed(Map<String, Object> payload) {
        try {
            byte[] body = mapper.writeValueAsBytes(payload);
            String sig = Hashing.hmacSha256Hex(props.payments().mock().webhookSecret(), body);
            return new WebhookRequest(body, "application/json", Map.of(SIGNATURE_HEADER, sig), Map.of());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Test : simule un encaissement d'un montant différent de la commande (fraude / erreur). */
    public void overrideChargedAmount(String reference, long amount) {
        Charge c = charges.getOrDefault(reference, new Charge(amount, PaymentStatus.PENDING));
        charges.put(reference, new Charge(amount, c.status()));
    }

    @Override
    public WebhookNotification parseWebhook(WebhookRequest req) {
        String expected = Hashing.hmacSha256Hex(props.payments().mock().webhookSecret(), req.body());
        boolean valid = Hashing.constantTimeEquals(expected, req.header(SIGNATURE_HEADER));
        try {
            JsonNode n = mapper.readTree(new String(req.body(), StandardCharsets.UTF_8));
            return new WebhookNotification(valid, n.path("event_id").asText(null), n.path("reference").asText(null),
                    "payment." + n.path("status").asText("unknown").toLowerCase(), n.hasNonNull("amount") ? n.get("amount").asLong() : null);
        } catch (Exception e) {
            return new WebhookNotification(false, null, null, "malformed", null);
        }
    }

    @Override
    public VerifiedPayment verify(Payable payable) {
        Charge c = charges.get(payable.getReference());
        if (c == null) return new VerifiedPayment(PaymentStatus.PENDING, null, "XOF");
        return new VerifiedPayment(c.status(), c.amount(), "XOF");
    }
}
