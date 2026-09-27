package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

/** Gate D (D59) : codes promo admin sur les abonnements — %, nombre d'usages, échéance, un usage par créateur. */
class PromoIT extends AbstractIT {

    private String newCode(MockHttpSession admin, int pct, int maxUses, Instant until) throws Exception {
        String code = "IT" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        Map<String, Object> body = new HashMap<>(Map.of("code", code.toLowerCase(), "percentOff", pct, "maxUses", maxUses));
        if (until != null) body.put("validUntil", until.toString());
        mvc.perform(post("/api/admin/promo-codes").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.code").value(code)).andExpect(jsonPath("$.usesCount").value(0));
        return code;
    }

    private org.springframework.test.web.servlet.ResultActions checkout(MockHttpSession s, String plan, String code) throws Exception {
        return mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("plan", plan, "phone", "+221770009999", "promoCode", code))));
    }

    @Test
    void apercuPuisPaiementAvecReductionEtUsageCompteAuPaiement() throws Exception {
        MockHttpSession admin = adminSession();
        String code = newCode(admin, 50, 10, null);
        MockHttpSession s = register(uniqueHandle("promo"));

        JsonNode quote = body(mvc.perform(get("/api/me/subscription/promo").session(s).param("code", code.toLowerCase()).param("plan", "boutique"))
                .andExpect(status().isOk()).andReturn());
        assertThat(quote.get("priceXof").asLong()).isEqualTo(2_700);
        assertThat(quote.get("discountXof").asLong()).isEqualTo(1_350);
        assertThat(quote.get("finalPriceXof").asLong()).isEqualTo(1_350);

        JsonNode co = body(checkout(s, "boutique", code).andExpect(status().isOk()).andReturn());
        assertThat(co.get("amountXof").asLong()).isEqualTo(1_350);
        assertThat(co.get("discountXof").asLong()).isEqualTo(1_350);
        // en attente de paiement : l'usage n'est pas encore compté, mais le même créateur ne peut pas le réutiliser
        assertThat(usesOf(admin, code)).isZero();
        checkout(s, "boutique", code).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROMO_ALREADY_USED"));

        mvc.perform(post("/api/payments/mock/subscription/" + co.get("reference").asText() + "/complete").param("outcome", "success"))
                .andExpect(status().isSeeOther());
        assertThat(getJson("/api/me/subscription", s).get("status").asText()).isEqualTo("active");
        assertThat(usesOf(admin, code)).isEqualTo(1);
    }

    @Test
    void codesRefusesExplicitement() throws Exception {
        MockHttpSession admin = adminSession();
        MockHttpSession s = register(uniqueHandle("prk"));
        mvc.perform(get("/api/me/subscription/promo").session(s).param("code", "NEXISTEPAS").param("plan", "standard"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("PROMO_INVALID"));
        // un code refusé au checkout n'est jamais ignoré en silence
        checkout(s, "standard", "NEXISTEPAS").andExpect(status().isNotFound());

        String once = newCode(admin, 20, 1, null);
        MockHttpSession a = register(uniqueHandle("pra"));
        String ref = body(checkout(a, "standard", once).andExpect(status().isOk()).andReturn()).get("reference").asText();
        mvc.perform(post("/api/payments/mock/subscription/" + ref + "/complete").param("outcome", "success")).andExpect(status().isSeeOther());
        mvc.perform(get("/api/me/subscription/promo").session(s).param("code", once).param("plan", "standard"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PROMO_EXHAUSTED"));

        String off = newCode(admin, 30, 5, null);
        String id = null;
        for (JsonNode p : getJson("/api/admin/promo-codes", admin)) if (p.get("code").asText().equals(off)) id = p.get("id").asText();
        mvc.perform(post("/api/admin/promo-codes/" + id + "/deactivate").session(admin).with(csrf())).andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
        mvc.perform(get("/api/me/subscription/promo").session(s).param("code", off).param("plan", "standard")).andExpect(status().isNotFound());

        mvc.perform(post("/api/admin/promo-codes").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("code", off, "percentOff", 10, "maxUses", 3)))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROMO_CODE_TAKEN"));
        mvc.perform(post("/api/admin/promo-codes").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("code", "PASSE", "percentOff", 10, "maxUses", 3, "validUntil", Instant.now().minus(1, ChronoUnit.DAYS).toString()))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void centPourcentActiveSansPaiementEtNeRapporteRienAuParrain() throws Exception {
        MockHttpSession admin = adminSession();
        String code = newCode(admin, 100, 3, Instant.now().plus(5, ChronoUnit.DAYS));
        MockHttpSession parrain = register(uniqueHandle("p100"));
        String ref = getJson("/api/me/referrals", parrain).get("code").asText();
        MockHttpSession s = register(uniqueHandle("f100"), "f100" + UUID.randomUUID().toString().substring(0, 6) + "@test.sn", ref);

        JsonNode co = body(checkout(s, "standard", code).andExpect(status().isOk()).andReturn());
        assertThat(co.get("status").asText()).isEqualTo("PAID");
        assertThat(co.get("amountXof").asLong()).isZero();
        assertThat(co.has("paymentUrl")).isFalse();
        assertThat(getJson("/api/me/subscription", s).get("status").asText()).isEqualTo("active");
        assertThat(usesOf(admin, code)).isEqualTo(1);
        assertThat(getJson("/api/me/referrals", parrain).at("/recentEarnings").size()).isZero();
    }

    @Test
    void creationReserveeAuxAdmins() throws Exception {
        MockHttpSession s = register(uniqueHandle("nprom"));
        mvc.perform(get("/api/admin/promo-codes").session(s)).andExpect(status().isForbidden());
    }

    private int usesOf(MockHttpSession admin, String code) throws Exception {
        for (JsonNode p : getJson("/api/admin/promo-codes", admin)) if (p.get("code").asText().equals(code)) return p.get("usesCount").asInt();
        throw new AssertionError("code introuvable : " + code);
    }
}
