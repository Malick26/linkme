package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.linkme.api.payments.LedgerEntryRepository;
import com.linkme.api.payments.MockPaymentProvider;
import com.linkme.api.payments.PaymentEventRepository;
import com.linkme.api.payments.PaymentProvider.PaymentStatus;
import com.linkme.api.payments.PaymentProvider.WebhookRequest;
import com.linkme.api.shop.OrderRepository;
import com.linkme.api.shop.OrderStatus;
import com.linkme.api.shop.ProductRepository;
import com.linkme.api.shop.ShopOrder;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** Gate 3 : achat complet (Mock), rejeu, signature invalide, montant altéré, stock, idempotence, états finaux. */
class CheckoutAndWebhookIT extends AbstractIT {
    @Autowired MockPaymentProvider mock;
    @Autowired OrderRepository orders;
    @Autowired ProductRepository products;
    @Autowired LedgerEntryRepository ledger;
    @Autowired PaymentEventRepository events;

    String hoodieId;

    @BeforeEach
    void findProduct() throws Exception {
        JsonNode shop = body(mvc.perform(get("/api/public/malick/blocks/shop")).andReturn());
        for (JsonNode p : shop.get("products")) if (p.get("title").asText().startsWith("Hoodie")) hoodieId = p.get("id").asText();
        assertThat(hoodieId).isNotNull();
    }

    JsonNode checkout(int qty, String idem) throws Exception {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("productId", hoodieId);
        req.put("quantity", qty);
        req.put("buyerName", "Awa Diop");
        req.put("buyerPhone", "+221 77 000 00 00");
        req.put("buyerEmail", "awa@test.sn");
        if (idem != null) req.put("idempotencyKey", idem);
        return body(mvc.perform(post("/api/public/malick/checkout").contentType(MediaType.APPLICATION_JSON).content(json(req)))
                .andExpect(status().isCreated()).andReturn());
    }

    ResultActions deliver(WebhookRequest r) throws Exception {
        var b = post("/api/webhooks/mock").contentType(MediaType.APPLICATION_JSON).content(r.body());
        r.headers().forEach(b::header);
        return mvc.perform(b);
    }

    ShopOrder order(String ref) {
        return orders.findByReference(ref).orElseThrow();
    }

    @Test
    void achatCompletAvecLeMock() throws Exception {
        Integer stockBefore = products.findById(UUID.fromString(hoodieId)).orElseThrow().getStock();
        JsonNode c = checkout(2, null);
        String ref = c.get("reference").asText();
        assertThat(c.get("status").asText()).isEqualTo("PENDING");
        assertThat(c.get("amountXof").asLong()).isEqualTo(30_000);
        assertThat(c.get("paymentUrl").asText()).isEqualTo("/api/payments/mock/" + ref);

        mvc.perform(get("/api/payments/mock/" + ref)).andExpect(status().isOk());
        mvc.perform(post("/api/payments/mock/" + ref + "/complete").param("outcome", "success"))
                .andExpect(status().isSeeOther());

        ShopOrder o = order(ref);
        assertThat(o.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(o.getCommissionXof()).isEqualTo(2_400); // 8 % de 30 000
        assertThat(o.getNetXof()).isEqualTo(27_600);
        assertThat(ledger.findByOrderId(o.getId())).extracting(e -> e.getKind() + "=" + e.getAmountXof())
                .containsExactlyInAnyOrder("SALE_GROSS=30000", "COMMISSION=-2400", "CREATOR_NET=27600");
        assertThat(products.findById(UUID.fromString(hoodieId)).orElseThrow().getStock()).isEqualTo(stockBefore - 2);

        mvc.perform(get("/api/public/orders/" + ref)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID")).andExpect(jsonPath("$.creatorHandle").value("malick"));
    }

    @Test
    void rejeuDuMemeWebhookEstIdempotent() throws Exception {
        String ref = checkout(1, null).get("reference").asText();
        WebhookRequest r = mock.settle(ref, PaymentStatus.PAID);
        deliver(r).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PROCESSED"));
        deliver(r).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DUPLICATE"));
        assertThat(ledger.findByOrderId(order(ref).getId())).hasSize(3);
        // nouvel événement (autre id) sur commande finale : ALREADY_FINAL, aucune écriture supplémentaire
        deliver(mock.settle(ref, PaymentStatus.PAID)).andExpect(jsonPath("$.status").value("ALREADY_FINAL"));
        assertThat(ledger.findByOrderId(order(ref).getId())).hasSize(3);
    }

    @Test
    void signatureInvalideRejeteeEtJournalisee() throws Exception {
        String ref = checkout(1, null).get("reference").asText();
        WebhookRequest good = mock.settle(ref, PaymentStatus.PAID);
        WebhookRequest forged = new WebhookRequest(good.body(), good.contentType(), Map.of(MockPaymentProvider.SIGNATURE_HEADER, "00".repeat(32)), Map.of());
        deliver(forged).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_SIGNATURE"));
        assertThat(order(ref).getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(events.findByOrderReference(ref)).anyMatch(e -> "INVALID_SIGNATURE".equals(e.getResult()) && !e.isSignatureValid());
    }

    @Test
    void notificationForgeeNeBloquePasLaVraie() throws Exception {
        // une notification non signée ne doit pas pouvoir « réserver » l'identifiant d'événement de la vraie (D32)
        String ref = checkout(1, null).get("reference").asText();
        WebhookRequest real = mock.settle(ref, PaymentStatus.PAID);
        WebhookRequest forged = new WebhookRequest(real.body(), real.contentType(), Map.of(MockPaymentProvider.SIGNATURE_HEADER, "ff".repeat(32)), Map.of());
        deliver(forged).andExpect(status().isUnauthorized());
        deliver(real).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PROCESSED"));
        assertThat(order(ref).getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void montantAltereRefuse() throws Exception {
        String ref = checkout(1, null).get("reference").asText();
        // 1) le fournisseur a encaissé moins que le prix (session de paiement altérée)
        mock.overrideChargedAmount(ref, 100);
        deliver(mock.settle(ref, PaymentStatus.PAID)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("AMOUNT_MISMATCH"));
        ShopOrder o = order(ref);
        assertThat(o.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(o.isNeedsAttention()).isTrue();
        assertThat(ledger.findByOrderId(o.getId())).isEmpty();

        // 2) notification signée annonçant un montant différent du montant vérifié
        String ref2 = checkout(1, null).get("reference").asText();
        mock.settle(ref2, PaymentStatus.PAID);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event_id", "evt_" + UUID.randomUUID());
        payload.put("reference", ref2);
        payload.put("status", "PAID");
        payload.put("amount", 1);
        payload.put("currency", "XOF");
        deliver(mock.signed(payload)).andExpect(status().isBadRequest());
        assertThat(order(ref2).getStatus()).isEqualTo(OrderStatus.PENDING);
    }

    @Test
    void echecPuisSuccesIgnore() throws Exception {
        String ref = checkout(1, null).get("reference").asText();
        mvc.perform(post("/api/payments/mock/" + ref + "/complete").param("outcome", "failure")).andExpect(status().isSeeOther());
        assertThat(order(ref).getStatus()).isEqualTo(OrderStatus.FAILED);
        deliver(mock.settle(ref, PaymentStatus.PAID)).andExpect(jsonPath("$.status").value("ALREADY_FINAL"));
        assertThat(order(ref).getStatus()).isEqualTo(OrderStatus.FAILED);
    }

    @Test
    void idempotenceDuCheckoutEtStock() throws Exception {
        String key = "idem-" + UUID.randomUUID();
        String a = checkout(1, key).get("reference").asText();
        String b = checkout(1, key).get("reference").asText();
        assertThat(a).isEqualTo(b);
        mvc.perform(post("/api/public/malick/checkout").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("productId", hoodieId, "quantity", 11, "buyerName", "Awa", "buyerPhone", "+221770000000"))))
                .andExpect(status().isBadRequest());
        // produit inconnu / autre créateur → 404
        mvc.perform(post("/api/public/malick/checkout").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("productId", UUID.randomUUID().toString(), "quantity", 1, "buyerName", "Awa", "buyerPhone", "+221770000000"))))
                .andExpect(status().isNotFound());
    }

    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Test
    void journalEtGrandLivreImmuablesEnBase() throws Exception {
        String ref = checkout(1, null).get("reference").asText();
        deliver(mock.settle(ref, PaymentStatus.PAID)).andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("update payment_event set result = 'X' where order_reference = ?", ref))
                .hasMessageContaining("append-only");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("delete from ledger_entry where order_id = ?", order(ref).getId()))
                .hasMessageContaining("append-only");
    }
}
