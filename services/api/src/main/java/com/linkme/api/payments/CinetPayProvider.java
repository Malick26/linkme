package com.linkme.api.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.config.AppProperties;
import com.linkme.api.shop.ShopOrder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Adaptateur CinetPay (API v2, documentation publique). Activé uniquement si CINETPAY_API_KEY / SITE_ID / SECRET_KEY
 * sont présents. Notification : formulaire {@code cpm_*} + en-tête {@code x-token} (HMAC-SHA256 des champs concaténés,
 * clé secrète) ; statut re-vérifié via {@code POST /v2/payment/check}. NB : CinetPay exige un montant XOF multiple de 5.
 */
@Component
public class CinetPayProvider implements PaymentProvider {
    private static final Logger log = LoggerFactory.getLogger(CinetPayProvider.class);
    static final List<String> TOKEN_FIELDS = List.of("cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount", "cpm_currency", "signature",
            "payment_method", "cel_phone_num", "cpm_phone_prefixe", "cpm_language", "cpm_version", "cpm_payment_config", "cpm_page_action",
            "cpm_custom", "cpm_designation", "cpm_error_message");
    private final AppProperties.CinetPay cfg;
    private final RestClient http;

    public CinetPayProvider(AppProperties props, RestClient.Builder builder) {
        this.cfg = props.payments().cinetpay();
        this.http = builder.baseUrl("https://api-checkout.cinetpay.com/v2").build();
    }

    @Override
    public String id() {
        return "cinetpay";
    }

    @Override
    public boolean enabled() {
        return cfg != null && cfg.enabled();
    }

    @Override
    public PaymentInit initiate(ShopOrder order, PaymentUrls urls) {
        if (order.getAmountXof() % 5 != 0) {
            throw ApiException.badRequest("PAYMENT_AMOUNT", "Montant non accepté par le fournisseur (multiple de 5 FCFA requis).");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("apikey", cfg.apiKey());
        body.put("site_id", cfg.siteId());
        body.put("transaction_id", order.getReference());
        body.put("amount", order.getAmountXof());
        body.put("currency", "XOF");
        body.put("description", (order.getProductTitle() + " x" + order.getQuantity()).replaceAll("[^\\p{L}\\p{N} x]", " "));
        body.put("notify_url", urls.notifyUrl());
        body.put("return_url", urls.returnUrl());
        body.put("channels", "ALL");
        body.put("lang", "fr");
        body.put("customer_name", order.getBuyerName());
        body.put("customer_surname", order.getBuyerName());
        body.put("customer_phone_number", order.getBuyerPhone().replace(" ", ""));
        JsonNode res;
        try {
            res = http.post().uri("/payment").contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
        } catch (Exception e) {
            log.error("CinetPay init : {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_UNAVAILABLE", "Le paiement est momentanément indisponible.");
        }
        if (res == null || !"201".equals(res.path("code").asText())) {
            log.error("CinetPay init refusé : {}", res == null ? "vide" : res.path("message").asText());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PAYMENT_UNAVAILABLE", "Le paiement est momentanément indisponible.");
        }
        return new PaymentInit(res.path("data").path("payment_url").asText(), res.path("data").path("payment_token").asText());
    }

    @Override
    public WebhookNotification parseWebhook(WebhookRequest req) {
        Map<String, String> f = req.form();
        StringBuilder data = new StringBuilder();
        for (String k : TOKEN_FIELDS) data.append(f.getOrDefault(k, ""));
        String expected = Hashing.hmacSha256Hex(cfg.secretKey(), data.toString().getBytes(StandardCharsets.UTF_8));
        boolean valid = Hashing.constantTimeEquals(expected, req.header("x-token")) && cfg.siteId().equals(f.get("cpm_site_id"));
        return new WebhookNotification(valid, null, f.get("cpm_trans_id"), "payment.notification", PayDunyaProvider.parseLong(f.get("cpm_amount")));
    }

    @Override
    public VerifiedPayment verify(ShopOrder order) {
        Map<String, Object> body = Map.of("apikey", cfg.apiKey(), "site_id", cfg.siteId(), "transaction_id", order.getReference());
        JsonNode res = http.post().uri("/payment/check").contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
        if (res == null) return new VerifiedPayment(PaymentStatus.PENDING, null, "XOF");
        JsonNode d = res.path("data");
        PaymentStatus status = switch (d.path("status").asText("")) {
            case "ACCEPTED" -> PaymentStatus.PAID;
            case "REFUSED" -> PaymentStatus.FAILED;
            case "CANCELED", "CANCELLED" -> PaymentStatus.CANCELED;
            default -> PaymentStatus.PENDING;
        };
        return new VerifiedPayment(status, PayDunyaProvider.parseLong(d.path("amount").asText(null)), d.path("currency").asText("XOF"));
    }
}
