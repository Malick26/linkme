package com.linkme.api.payments;

import com.linkme.api.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Réception des notifications fournisseurs (JSON ou formulaire). Toujours idempotent. */
@RestController
public class WebhookController {
    private final PaymentService payments;

    public WebhookController(PaymentService payments) {
        this.payments = payments;
    }

    /** operationId: paymentWebhook */
    @PostMapping("/api/webhooks/{provider}")
    public ResponseEntity<Map<String, String>> webhook(@PathVariable String provider, @RequestBody(required = false) byte[] body,
                                                       HttpServletRequest request) {
        byte[] raw = body == null ? new byte[0] : body;
        if (raw.length > 64 * 1024) throw ApiException.badRequest("PAYLOAD_TOO_LARGE", "Notification trop volumineuse.");
        Map<String, String> headers = new HashMap<>();
        for (String name : Collections.list(request.getHeaderNames())) headers.put(name.toLowerCase(), request.getHeader(name));
        String ct = request.getContentType() == null ? "" : request.getContentType();
        Map<String, String> form = ct.startsWith("application/x-www-form-urlencoded") ? parseForm(new String(raw, StandardCharsets.UTF_8)) : Map.of();
        try {
            PaymentService.Outcome outcome = payments.handleWebhook(provider, new PaymentProvider.WebhookRequest(raw, ct, headers, form));
            if (outcome == PaymentService.Outcome.AMOUNT_MISMATCH) {
                throw ApiException.badRequest("AMOUNT_MISMATCH", "Montant incohérent.");
            }
            return ResponseEntity.ok(Map.of("status", outcome.name()));
        } catch (DataIntegrityViolationException e) {
            // course entre deux livraisons simultanées du même événement : la contrainte unique a joué
            return ResponseEntity.ok(Map.of("status", PaymentService.Outcome.DUPLICATE.name()));
        }
    }

    static Map<String, String> parseForm(String s) {
        Map<String, String> m = new LinkedHashMap<>();
        if (s.isBlank()) return m;
        for (String pair : s.split("&")) {
            int i = pair.indexOf('=');
            String k = URLDecoder.decode(i < 0 ? pair : pair.substring(0, i), StandardCharsets.UTF_8);
            String v = i < 0 ? "" : URLDecoder.decode(pair.substring(i + 1), StandardCharsets.UTF_8);
            m.put(k, v);
        }
        return m;
    }
}
