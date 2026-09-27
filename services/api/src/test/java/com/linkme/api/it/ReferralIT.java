package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.linkme.api.referral.ReferralService;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;

/**
 * Gate C (D51–D54) : code de parrainage, rattachement à l'inscription, commission de 20 % sur CHAQUE paiement
 * d'abonnement du filleul, gel de 7 jours, masquage des filleuls, blocage de l'auto-parrainage, idempotence.
 */
class ReferralIT extends AbstractIT {
    @Autowired JdbcTemplate jdbc;
    @Autowired ReferralService referralService;

    private static String email(String h) {
        return h + "-" + UUID.randomUUID().toString().substring(0, 6) + "@test.sn";
    }

    private static String phone() {
        return "+22177" + String.format("%07d", Math.abs(UUID.randomUUID().getMostSignificantBits() % 10_000_000));
    }

    @Test
    void codeDeParrainageConsultableEtCodeInconnuEn404() throws Exception {
        String h = uniqueHandle("par");
        MockHttpSession a = register(h);
        JsonNode me = getJson("/api/me/referrals", a);
        String code = me.get("code").asText();
        assertThat(code).matches("^[A-HJ-NP-Z2-9]{8}$");
        assertThat(me.get("link").asText()).endsWith("/r/" + code);
        assertThat(me.get("baseRateBps").asInt()).isEqualTo(2000);
        assertThat(me.get("effectiveRateBps").asInt()).isEqualTo(2000);
        // stable d'un appel à l'autre
        assertThat(getJson("/api/me/referrals", a).get("code").asText()).isEqualTo(code);

        mvc.perform(get("/api/auth/referral-codes/" + code.toLowerCase())).andExpect(status().isOk())
                .andExpect(jsonPath("$.referrerName").value("Créateur " + h));
        mvc.perform(get("/api/auth/referral-codes/ZZZZZZZZ")).andExpect(status().isNotFound());
        mvc.perform(get("/api/auth/referral-codes/pas-un-code")).andExpect(status().isNotFound());
    }

    @Test
    void chaquePaiementDuFilleulRapporte20PourcentGeleSeptJours() throws Exception {
        MockHttpSession a = register(uniqueHandle("pa"));
        String code = getJson("/api/me/referrals", a).get("code").asText();
        MockHttpSession b = register(uniqueHandle("fi"), email("fi"), code);

        // inscrit mais pas encore abonné : gain potentiel = 20 % du plan Standard
        JsonNode before = getJson("/api/me/referrals", a);
        assertThat(before.at("/stats/signups").asInt()).isEqualTo(1);
        assertThat(before.at("/stats/potentialMonthlyXof").asLong()).isEqualTo(220);
        assertThat(before.at("/stats/realEarnedXof").asLong()).isZero();
        assertThat(before.at("/referees/0/status").asText()).isEqualTo("registered");

        String phoneB = phone();
        paySubscription(b, "standard", phoneB);
        JsonNode after = getJson("/api/me/referrals", a);
        assertThat(after.at("/stats/activeReferees").asInt()).isEqualTo(1);
        assertThat(after.at("/stats/realEarnedXof").asLong()).isEqualTo(220);
        assertThat(after.at("/stats/currentMonthlyXof").asLong()).isEqualTo(220);
        assertThat(after.at("/stats/potentialMonthlyXof").asLong()).isZero();
        assertThat(after.at("/recentEarnings/0/amountXof").asLong()).isEqualTo(220);
        assertThat(after.at("/recentEarnings/0/rateBps").asInt()).isEqualTo(2000);
        assertThat(after.at("/recentEarnings/0/status").asText()).isEqualTo("held");
        // identité du filleul masquée
        String masked = after.at("/referees/0/maskedName").asText();
        assertThat(masked).contains("***").doesNotContain("Créateur");
        assertThat(after.at("/referees/0/maskedPhone").asText()).contains("***").doesNotContain(phoneB.substring(6, 11));

        // gelé 7 jours : rien de retirable
        JsonNode wallet = getJson("/api/me/wallet", a);
        assertThat(wallet.get("heldXof").asLong()).isEqualTo(220);
        assertThat(wallet.get("availableXof").asLong()).isZero();
        assertThat(wallet.get("holdDays").asInt()).isEqualTo(7);
        assertThat(wallet.get("nextReleaseAt").asText()).isNotBlank();

        // renouvellement (boutique) : nouveau gain sur ce paiement aussi (tous les abonnements, D51)
        paySubscription(b, "boutique", phoneB);
        JsonNode again = getJson("/api/me/referrals", a);
        assertThat(again.at("/stats/realEarnedXof").asLong()).isEqualTo(220 + 540);
        assertThat(getJson("/api/me/wallet", a).get("heldXof").asLong()).isEqualTo(760);
    }

    @Test
    void autoParrainageBloqueLeGain() throws Exception {
        MockHttpSession a = register(uniqueHandle("self"));
        String phoneA = phone();
        paySubscription(a, "standard", phoneA); // le numéro de A est désormais connu
        String code = getJson("/api/me/referrals", a).get("code").asText();

        MockHttpSession fake = register(uniqueHandle("fake"), email("fake"), code);
        paySubscription(fake, "standard", phoneA); // le « filleul » paie avec le numéro du parrain

        JsonNode r = getJson("/api/me/referrals", a);
        assertThat(r.at("/recentEarnings/0/status").asText()).isEqualTo("blocked");
        assertThat(r.at("/recentEarnings/0/blockReason").asText()).isEqualTo("SELF_PAYMENT");
        assertThat(r.at("/stats/realEarnedXof").asLong()).isZero();
        JsonNode w = getJson("/api/me/wallet", a);
        assertThat(w.get("heldXof").asLong()).isZero();
        assertThat(w.get("availableXof").asLong()).isZero();
    }

    @Test
    void codeInconnuNeBloquePasLInscriptionEtOnNeSeParraineJamaisSoiMeme() throws Exception {
        MockHttpSession x = register(uniqueHandle("nocode"), email("nocode"), "ZZZZZZZZ");
        assertThat(getJson("/api/me", x).get("handle").asText()).isNotBlank();
        UUID id = UUID.fromString(getJson("/api/me", x).get("id").asText());
        assertThat(jdbc.queryForObject("select count(*) from referral where referee_id = ?", Long.class, id)).isZero();
    }

    @Test
    void creditEstIdempotentEtLeRattrapageNeDoublePas() throws Exception {
        MockHttpSession a = register(uniqueHandle("idp"));
        String code = getJson("/api/me/referrals", a).get("code").asText();
        MockHttpSession b = register(uniqueHandle("idf"), email("idf"), code);
        String ref = paySubscription(b, "standard", phone());
        UUID paymentId = jdbc.queryForObject("select id from subscription_payment where reference = ?", UUID.class, ref);

        assertThat(referralService.credit(paymentId)).isFalse();
        referralService.reconcile();
        assertThat(jdbc.queryForObject("select count(*) from referral_earning where subscription_payment_id = ?", Long.class, paymentId)).isEqualTo(1);
        assertThat(getJson("/api/me/wallet", a).get("heldXof").asLong()).isEqualTo(220);
    }

    @Test
    void grandLivreDuPortefeuilleEstAppendOnly() throws Exception {
        MockHttpSession a = register(uniqueHandle("ao"));
        String code = getJson("/api/me/referrals", a).get("code").asText();
        MockHttpSession b = register(uniqueHandle("aof"), email("aof"), code);
        paySubscription(b, "standard", phone());
        UUID userId = UUID.fromString(getJson("/api/me", a).get("id").asText());
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("update wallet_entry set amount_xof = 999999 where user_id = ?", userId))
                .hasMessageContaining("append-only");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("delete from referral_earning where referrer_id = ?", userId))
                .hasMessageContaining("append-only");
    }

    @Test
    void espaceAdminInterditAuxCreateurs() throws Exception {
        MockHttpSession a = register(uniqueHandle("nadm"));
        assertThat(getJson("/api/me", a).get("admin").asBoolean()).isFalse();
        mvc.perform(get("/api/admin/withdrawals").session(a)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/withdrawals/" + UUID.randomUUID() + "/pay").session(a).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of()))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/withdrawals")).andExpect(status().isUnauthorized());
        assertThat(getJson("/api/me", adminSession()).get("admin").asBoolean()).isTrue();
    }
}
