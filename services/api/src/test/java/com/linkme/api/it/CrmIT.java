package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;

/** Gate D (D60–D63) : inscription prospect, segments du CRM, email groupé avec désinscription, journal des relances. */
class CrmIT extends AbstractIT {
    @Autowired JdbcTemplate jdbc;

    private org.springframework.test.web.servlet.ResultActions join(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/public/prospects").contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private JsonNode find(JsonNode list, String field, String value) {
        for (JsonNode c : list) if (value.equals(c.path(field).asText())) return c;
        return null;
    }

    @Test
    void inscriptionProspectSansEnumerationNiDoublon() throws Exception {
        String email = "prospect-" + UUID.randomUUID().toString().substring(0, 8) + "@test.sn";
        join(Map.of("name", "Awa", "email", email, "consent", true)).andExpect(status().isAccepted());
        join(Map.of("email", email.toUpperCase(), "phone", "+221 78 123 45 67", "consent", true)).andExpect(status().isAccepted());
        assertThat(jdbc.queryForObject("select count(*) from prospect where lower(email) = ?", Long.class, email)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select phone from prospect where lower(email) = ?", String.class, email)).isEqualTo("+221781234567");

        join(Map.of("name", "Sans contact", "consent", true)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("email"));
        join(Map.of("email", "x-" + email, "consent", false)).andExpect(status().isBadRequest());
        // robot : champ piège rempli → réponse identique, rien d'enregistré
        String bot = "bot-" + email;
        join(Map.of("email", bot, "consent", true, "website", "http://spam")).andExpect(status().isAccepted());
        assertThat(jdbc.queryForObject("select count(*) from prospect where email = ?", Long.class, bot)).isZero();
    }

    @Test
    void segmentsEmailGroupeEtDesinscription() throws Exception {
        MockHttpSession admin = adminSession();
        String email = "crm-" + UUID.randomUUID().toString().substring(0, 8) + "@test.sn";
        join(Map.of("name", "Fatou", "email", email, "consent", true)).andExpect(status().isAccepted());

        JsonNode prospects = getJson("/api/admin/crm/contacts?segment=prospects", admin);
        JsonNode me = find(prospects, "email", email);
        assertThat(me).isNotNull();
        assertThat(me.get("optedOut").asBoolean()).isFalse();

        // créateur jamais abonné visible dans son segment, puis dans « actifs » une fois abonné
        String h = uniqueHandle("crm");
        MockHttpSession creator = register(h);
        assertThat(find(getJson("/api/admin/crm/contacts?segment=never_subscribed", admin), "handle", h)).isNotNull();
        paySubscription(creator, "standard", "+221770004444");
        assertThat(find(getJson("/api/admin/crm/contacts?segment=active", admin), "handle", h)).isNotNull();
        assertThat(find(getJson("/api/admin/crm/contacts?segment=never_subscribed", admin), "handle", h)).isNull();

        JsonNode res = body(mvc.perform(post("/api/admin/crm/emails").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("segment", "prospects", "subject", "Nouveautés", "body", "Bonjour {nom}, LinkMe arrive !"))))
                .andExpect(status().isOk()).andReturn());
        assertThat(res.get("sent").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(find(getJson("/api/admin/crm/contacts?segment=prospects", admin), "email", email).get("lastContactedAt").asText()).isNotBlank();

        // le lien de désinscription retire le contact des envois suivants ; un jeton inconnu répond pareil
        String token = jdbc.queryForObject("select unsubscribe_token from prospect where email = ?", String.class, email);
        mvc.perform(post("/api/public/unsubscribe").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", token))))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/public/unsubscribe").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", "inconnu"))))
                .andExpect(status().isNoContent());
        assertThat(find(getJson("/api/admin/crm/contacts?segment=prospects", admin), "email", email).get("optedOut").asBoolean()).isTrue();

        // créateurs : jeton créé au premier email, désinscription par le même chemin
        mvc.perform(post("/api/admin/crm/emails").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("segment", "active", "subject", "Merci", "body", "Merci {nom} !")))).andExpect(status().isOk());
        String creatorToken = jdbc.queryForObject(
                "select u.unsubscribe_token from users u join creator_profile p on p.user_id = u.id where p.handle = ?", String.class, h);
        assertThat(creatorToken).isNotBlank();
        mvc.perform(post("/api/public/unsubscribe").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", creatorToken))))
                .andExpect(status().isNoContent());
        assertThat(find(getJson("/api/admin/crm/contacts?segment=active", admin), "handle", h).get("optedOut").asBoolean()).isTrue();
    }

    @Test
    void journalDesRelancesWhatsapp() throws Exception {
        MockHttpSession admin = adminSession();
        String h = uniqueHandle("wa");
        MockHttpSession c = register(h);
        String id = getJson("/api/me", c).get("id").asText();
        mvc.perform(post("/api/admin/crm/contacts/creator/" + id + "/log").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("channel", "whatsapp")))).andExpect(status().isNoContent());
        assertThat(find(getJson("/api/admin/crm/contacts?segment=never_subscribed", admin), "handle", h).get("lastContactedAt").asText()).isNotBlank();
        mvc.perform(post("/api/admin/crm/contacts/creator/" + UUID.randomUUID() + "/log").session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("channel", "whatsapp")))).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/crm/contacts").session(c).param("segment", "prospects")).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/crm/contacts").session(admin).param("segment", "nimporte")).andExpect(status().isBadRequest());
    }
}
