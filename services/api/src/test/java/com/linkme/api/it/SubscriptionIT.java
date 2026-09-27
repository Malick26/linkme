package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.linkme.api.profile.CreatorProfileRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

/**
 * Gate : abonnement obligatoire pour la visibilité publique (D44), catalogue des plans (D45),
 * parcours de paiement mock (D47) et blocage boutique hors plan Boutique (D45).
 */
class SubscriptionIT extends AbstractIT {
    @Autowired CreatorProfileRepository profiles;

    @Test
    void cataloguePublicDesPlans() throws Exception {
        JsonNode plans = body(mvc.perform(get("/api/subscriptions/plans")).andExpect(status().isOk()).andReturn());
        assertThat(plans).hasSize(2);
        JsonNode standard = plans.get(0), boutique = plans.get(1);
        assertThat(standard.get("plan").asText()).isEqualTo("standard");
        assertThat(standard.get("priceXof").asLong()).isEqualTo(1_100);
        assertThat(standard.get("hasShop").asBoolean()).isFalse();
        assertThat(boutique.get("plan").asText()).isEqualTo("boutique");
        assertThat(boutique.get("priceXof").asLong()).isEqualTo(2_700);
        assertThat(boutique.get("hasShop").asBoolean()).isTrue();
    }

    @Test
    void profilPublieMaisSansAbonnementResteMasque() throws Exception {
        String h = uniqueHandle("noab");
        MockHttpSession s = register(h);
        mvc.perform(post("/api/me/theme/publish").session(s).with(csrf())).andExpect(status().isOk());
        // publié, mais aucun abonnement payé : la page publique reste masquée (D44)
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        assertThat(getJson("/api/me/subscription", s).get("status").asText()).isEqualTo("inactive");
    }

    @Test
    void checkoutMockPuisWebhookActivePuisRendVisible() throws Exception {
        String h = uniqueHandle("sub");
        MockHttpSession s = register(h);
        mvc.perform(post("/api/me/theme/publish").session(s).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound());

        JsonNode checkout = body(mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("plan", "standard", "phone", "+221 77 000 00 02"))))
                .andExpect(status().isOk()).andReturn());
        String reference = checkout.get("reference").asText();
        assertThat(checkout.get("status").asText()).isEqualTo("PENDING");
        assertThat(checkout.get("amountXof").asLong()).isEqualTo(1_100);
        assertThat(reference).startsWith("SB-");

        // page toujours masquée avant le paiement effectif
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound());

        mvc.perform(post("/api/payments/mock/subscription/" + reference + "/complete").param("outcome", "success"))
                .andExpect(status().isSeeOther());

        JsonNode sub = getJson("/api/me/subscription", s);
        assertThat(sub.get("status").asText()).isEqualTo("active");
        assertThat(sub.get("plan").asText()).isEqualTo("standard");
        assertThat(sub.get("canPublish").asBoolean()).isTrue();
        assertThat(sub.get("daysRemaining").asLong()).isEqualTo(30);

        JsonNode pub = body(mvc.perform(get("/api/public/" + h)).andExpect(status().isOk()).andReturn());
        assertThat(pub.at("/profile/handle").asText()).isEqualTo(h);

        JsonNode payment = getJson("/api/me/subscription/payments/" + reference, s);
        assertThat(payment.get("status").asText()).isEqualTo("PAID");
        assertThat(payment.get("plan").asText()).isEqualTo("standard");
    }

    @Test
    void echecDePaiementNeDebloquePasLaPage() throws Exception {
        String h = uniqueHandle("ko");
        MockHttpSession s = register(h);
        mvc.perform(post("/api/me/theme/publish").session(s).with(csrf())).andExpect(status().isOk());

        JsonNode checkout = body(mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("plan", "standard", "phone", "+221770000003"))))
                .andExpect(status().isOk()).andReturn());
        String reference = checkout.get("reference").asText();
        mvc.perform(post("/api/payments/mock/subscription/" + reference + "/complete").param("outcome", "failure"))
                .andExpect(status().isSeeOther());

        assertThat(getJson("/api/me/subscription", s).get("status").asText()).isEqualTo("inactive");
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound());
        assertThat(getJson("/api/me/subscription/payments/" + reference, s).get("status").asText()).isEqualTo("FAILED");
    }

    @Test
    void checkoutEstIdempotentSurLaMemeCle() throws Exception {
        String h = uniqueHandle("idem");
        MockHttpSession s = register(h);
        String key = "idem-" + UUID.randomUUID();
        JsonNode a = body(mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("plan", "standard", "phone", "+221770000004", "idempotencyKey", key))))
                .andExpect(status().isOk()).andReturn());
        JsonNode b = body(mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("plan", "standard", "phone", "+221770000004", "idempotencyKey", key))))
                .andExpect(status().isOk()).andReturn());
        assertThat(a.get("reference").asText()).isEqualTo(b.get("reference").asText());
    }

    @Test
    void planStandardNePeutPasCreerDeBlocBoutique() throws Exception {
        String h = uniqueHandle("std");
        MockHttpSession s = register(h);
        activateSubscription(s, "standard");
        mvc.perform(post("/api/me/blocks").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", "shop", "title", "Ma boutique"))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PLAN_REQUIRED"));
    }

    @Test
    void abonnementBoutiqueAutoriseLeBlocBoutiqueEtLeCheckoutBoutiqueExigeToujoursLePlan() throws Exception {
        String h = uniqueHandle("bou");
        MockHttpSession s = register(h);
        activateSubscription(s, "boutique");
        mvc.perform(post("/api/me/blocks").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", "shop", "title", "Ma boutique"))))
                .andExpect(status().isCreated());
        assertThat(profiles.findById(UUID.fromString(getJson("/api/me", s).get("id").asText())).orElseThrow().isBoutique()).isTrue();
    }
}
