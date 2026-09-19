package com.linkme.api.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.config.AppProperties;
import com.linkme.api.shop.ShopOrder;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Adaptateur PayDunya (Wave, Orange Money, Free Money…) — API « Checkout Invoice » v1 (documentation publique).
 * Activé uniquement si PAYDUNYA_MASTER_KEY / PRIVATE_KEY / TOKEN sont présents.
 * IPN : formulaire {@code data[...]} ; authenticité = {@code data[hash]} == SHA-512(clé principale) ; statut re-vérifié via
 * {@code GET /checkout-invoice/confirm/{token}}.
 */
@Component
public class PayDunyaProvider implements PaymentProvider {
    private static final Logger log = LoggerFactory.getLogger(PayDunyaProvider.class);
    private final AppProperties.PayDunya cfg;
    private final RestClient http;

    public PayDunyaProvider(AppProperties props, RestClient.Builder builder) {
        this.cfg = props.payments().paydunya();
        String base = cfg != null && cfg.live() ? "https://app.paydunya.com/api/v1" : "https://app.paydunya.com/sandbox-api/v1";
        this.http = builder.baseUrl(base).build();
    }

    @Override
    public String id() {
        return "paydunya";
    }

    @Override
    public boolean enabled() {
        return cfg != null && cfg.enabled();
    }

    private RestClient.RequestHeadersSpec<?> auth(RestClient.RequestHeadersSpec<?> spec) {
        return spec.header("PAYDUNYA-MASTER-KEY", cfg.masterKey())
                .header("PAYDUNYA-PRIVATE-KEY", cfg.privateKey())
                .header("PAYDUNYA-TOKEN", cfg.token());
    }

    @Override
    public PaymentInit initiate(ShopOrder order, PaymentUrls urls) {
        Map<String, Object> body = Map.of(
                "invoice", Map.of("total_amount", order.getAmountXof(), "description", order.getProductTitle() + " × " + order.getQuantity()),
                "store", Map.of("name", "LinkMe"),
                "custom_data", Map.of("reference", order.getReference()),
                "actions", Map.of("cancel_url", urls.cancelUrl(), "return_url", urls.returnUrl(), "callback_url", urls.notifyUrl()));
        JsonNode res;
        try {
            res = auth(http.post().uri("/checkout-invoice/create").contentType(MediaType.APPLICATION_JSON).body(body))
                    .retrieve().body(JsonNode.class);
        } catch (Exception e) {
            log.error("PayDunya create : {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_UNAVAILABLE", "Le paiement est momentanément indisponible.");
        }
        if (res == null || !"00".equals(res.path("response_code").asText())) {
            log.error("PayDunya create refusé : {}", res == null ? "vide" : res.path("response_text").asText());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_UNAVAILABLE", "Le paiement est momentanément indisponible.");
        }
        return new PaymentInit(res.path("response_text").asText(), res.path("token").asText());
    }

    @Override
    public WebhookNotification parseWebhook(WebhookRequest req) {
        Map<String, String> f = req.form();
        String hash = f.get("data[hash]");
        boolean valid = hash != null && Hashing.constantTimeEquals(Hashing.sha512Hex(cfg.masterKey()), hash.toLowerCase());
        String token = f.get("data[invoice][token]");
        String status = f.getOrDefault("data[status]", "unknown");
        Long amount = parseLong(f.get("data[invoice][total_amount]"));
        return new WebhookNotification(valid, token == null ? null : token + ":" + status, f.get("data[custom_data][reference]"),
                "invoice." + status, amount);
    }

    @Override
    public VerifiedPayment verify(ShopOrder order) {
        JsonNode res = auth(http.get().uri("/checkout-invoice/confirm/{token}", order.getProviderRef())).retrieve().body(JsonNode.class);
        if (res == null || !"00".equals(res.path("response_code").asText())) return new VerifiedPayment(PaymentStatus.PENDING, null, "XOF");
        String ref = res.path("custom_data").path("reference").asText(null);
        if (ref != null && !ref.equals(order.getReference())) return new VerifiedPayment(PaymentStatus.PENDING, null, "XOF");
        PaymentStatus status = switch (res.path("status").asText("")) {
            case "completed" -> PaymentStatus.PAID;
            case "cancelled" -> PaymentStatus.CANCELED;
            case "failed" -> PaymentStatus.FAILED;
            default -> PaymentStatus.PENDING;
        };
        return new VerifiedPayment(status, parseLong(res.path("invoice").path("total_amount").asText(null)), "XOF");
    }

    static Long parseLong(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return new java.math.BigDecimal(s.trim()).longValueExact();
        } catch (Exception e) {
            return null;
        }
    }
}
