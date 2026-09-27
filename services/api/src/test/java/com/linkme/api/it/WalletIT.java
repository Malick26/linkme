package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;

/**
 * Gate C (D52, D55, D56) : collab négociée à 60 %, retrait minimum 1 500 FCFA, réservation du solde, une demande
 * ouverte à la fois, refus = recrédit, paiement définitif. Gel ramené à 0 jour ici pour exercer le retrait
 * (le gel de 7 jours est vérifié par ReferralIT).
 */
@TestPropertySource(properties = "app.referral.hold-days=0")
class WalletIT extends AbstractIT {

    private MockHttpSession creatorWithCollabEarning(String prefix) throws Exception {
        String h = uniqueHandle(prefix);
        MockHttpSession a = register(h);
        String code = getJson("/api/me/referrals", a).get("code").asText();
        MockHttpSession admin = adminSession();
        mvc.perform(put("/api/admin/referrers/" + h + "/collab").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("rateBps", 6000, "expiresAt", Instant.now().plus(30, ChronoUnit.DAYS).toString()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.effectiveRateBps").value(6000));
        MockHttpSession b = register(uniqueHandle(prefix + "f"), prefix + UUID.randomUUID().toString().substring(0, 6) + "@test.sn", code);
        paySubscription(b, "boutique", "+2217655" + String.format("%05d", (int) (Math.random() * 100_000)));
        return a;
    }

    private org.springframework.test.web.servlet.ResultActions withdraw(MockHttpSession s, long amount) throws Exception {
        return mvc.perform(post("/api/me/wallet/withdrawals").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("amountXof", amount, "method", "wave", "phone", "+221 70 111 22 33"))));
    }

    @Test
    void collabA60PourcentPuisParcoursDeRetraitComplet() throws Exception {
        MockHttpSession a = creatorWithCollabEarning("col");
        JsonNode overview = getJson("/api/me/referrals", a);
        assertThat(overview.at("/effectiveRateBps").asInt()).isEqualTo(6000);
        assertThat(overview.at("/collab/rateBps").asInt()).isEqualTo(6000);
        assertThat(overview.at("/recentEarnings/0/amountXof").asLong()).isEqualTo(1_620); // 60 % de 2 700
        assertThat(getJson("/api/me/wallet", a).get("availableXof").asLong()).isEqualTo(1_620);

        withdraw(a, 1_000).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("amountXof"));
        withdraw(a, 2_000).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"));
        JsonNode w = body(withdraw(a, 1_500).andExpect(status().isCreated()).andReturn());
        assertThat(w.get("status").asText()).isEqualTo("REQUESTED");
        assertThat(w.get("maskedPhone").asText()).isEqualTo("+221 70 *** ** 33");
        withdraw(a, 100).andExpect(status().isBadRequest());
        JsonNode wallet = getJson("/api/me/wallet", a);
        assertThat(wallet.get("availableXof").asLong()).isEqualTo(120);
        assertThat(wallet.get("pendingWithdrawalXof").asLong()).isEqualTo(1_500);

        // une seule demande ouverte à la fois (le solde restant ne suffit de toute façon pas, on force le cas via 1 500)
        MockHttpSession admin = adminSession();
        JsonNode list = getJson("/api/admin/withdrawals?status=REQUESTED", admin);
        JsonNode mine = null;
        for (JsonNode x : list) if (x.get("id").asText().equals(w.get("id").asText())) mine = x;
        assertThat(mine).isNotNull();
        assertThat(mine.get("phone").asText()).isEqualTo("+221701112233"); // l'admin voit le numéro complet pour payer
        assertThat(mine.at("/signals/referees").asInt()).isEqualTo(1);

        String id = w.get("id").asText();
        mvc.perform(post("/api/admin/withdrawals/" + id + "/reject").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of()))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/withdrawals/" + id + "/reject").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("note", "Numéro Wave introuvable")))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        JsonNode afterReject = getJson("/api/me/wallet", a);
        assertThat(afterReject.get("availableXof").asLong()).isEqualTo(1_620);
        assertThat(afterReject.at("/withdrawals/0/note").asText()).isEqualTo("Numéro Wave introuvable");

        String id2 = body(withdraw(a, 1_620).andExpect(status().isCreated()).andReturn()).get("id").asText();
        withdraw(a, 1_500).andExpect(status().isConflict()); // solde réservé : plus rien de retirable
        mvc.perform(post("/api/admin/withdrawals/" + id2 + "/pay").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("providerRef", "WAVE-TX-42")))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"));
        mvc.perform(post("/api/admin/withdrawals/" + id2 + "/pay").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of()))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("WITHDRAWAL_FINAL"));
        mvc.perform(post("/api/admin/withdrawals/" + id + "/reject").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("note", "x")))).andExpect(status().isConflict());

        JsonNode fin = getJson("/api/me/wallet", a);
        assertThat(fin.get("availableXof").asLong()).isZero();
        assertThat(fin.get("totalWithdrawnXof").asLong()).isEqualTo(1_620);
        assertThat(fin.get("totalEarnedXof").asLong()).isEqualTo(1_620);
    }

    @Test
    void uneSeuleDemandeOuverteALaFois() throws Exception {
        MockHttpSession a = creatorWithCollabEarning("one");
        MockHttpSession admin = adminSession();
        // deuxième gain pour avoir de quoi tenter deux retraits
        String code = getJson("/api/me/referrals", a).get("code").asText();
        MockHttpSession c = register(uniqueHandle("onec"), "onec" + UUID.randomUUID().toString().substring(0, 6) + "@test.sn", code);
        paySubscription(c, "boutique", "+221764440000");
        withdraw(a, 1_500).andExpect(status().isCreated());
        withdraw(a, 1_500).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("WITHDRAWAL_PENDING"));
        assertThat(getJson("/api/admin/withdrawals", admin).size()).isGreaterThan(0);
    }

    @Test
    void collabPlafonneeA60PourcentEtFinDeCollab() throws Exception {
        String h = uniqueHandle("cap");
        register(h);
        MockHttpSession admin = adminSession();
        mvc.perform(put("/api/admin/referrers/" + h + "/collab").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("rateBps", 7000, "expiresAt", Instant.now().plus(1, ChronoUnit.DAYS).toString()))))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/referrers/" + h + "/collab").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("rateBps", 4000, "expiresAt", Instant.now().minus(1, ChronoUnit.DAYS).toString()))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("expiresAt"));
        mvc.perform(put("/api/admin/referrers/" + h + "/collab").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("rateBps", 4000, "expiresAt", Instant.now().plus(1, ChronoUnit.DAYS).toString()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.effectiveRateBps").value(4000));
        mvc.perform(delete("/api/admin/referrers/" + h + "/collab").session(admin).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.effectiveRateBps").value(2000));
        mvc.perform(get("/api/admin/referrers/inconnu-" + UUID.randomUUID().toString().substring(0, 6)).session(admin))
                .andExpect(status().isNotFound());
    }
}
