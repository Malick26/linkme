package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;

/** Gate E (D64–D66) : annonces en pop-up par public et par période ; liste des collabs. */
@Sql(statements = "DELETE FROM announcement")
class AnnouncementIT extends AbstractIT {

    private Map<String, Object> input(String title, String audience, boolean active) {
        Map<String, Object> m = new HashMap<>();
        m.put("title", title);
        m.put("body", "Texte de " + title);
        m.put("audience", audience);
        m.put("active", active);
        return m;
    }

    private JsonNode create(MockHttpSession admin, Map<String, Object> in) throws Exception {
        return body(mvc.perform(post("/api/admin/announcements").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(in)))
                .andExpect(status().isCreated()).andReturn());
    }

    @Test
    void uneAnnonceParPublicLaPlusRecenteEnLigne() throws Exception {
        MockHttpSession admin = adminSession();
        mvc.perform(get("/api/public/announcements/current").param("audience", "landing")).andExpect(status().isNoContent());

        Map<String, Object> both = input("Pour tous", "both", true);
        both.put("ctaLabel", "S'abonner");
        both.put("ctaUrl", "/app/abonnement");
        create(admin, both);
        Map<String, Object> dash = input("Créateurs", "dashboard", true);
        // créée après « Pour tous », donc plus récente : c'est elle qui s'affiche sur le tableau de bord
        Thread.sleep(5);
        create(admin, dash);
        Map<String, Object> future = input("Plus tard", "landing", true);
        future.put("startsAt", Instant.now().plus(2, ChronoUnit.DAYS).toString());
        create(admin, future);
        create(admin, input("Brouillon", "landing", false));

        mvc.perform(get("/api/public/announcements/current").param("audience", "landing")).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Pour tous")).andExpect(jsonPath("$.ctaUrl").value("/app/abonnement"));
        mvc.perform(get("/api/public/announcements/current").param("audience", "dashboard")).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Créateurs"));
        mvc.perform(get("/api/public/announcements/current").param("audience", "partout")).andExpect(status().isBadRequest());

        JsonNode list = getJson("/api/admin/announcements", admin);
        assertThat(list).hasSize(4);
        int live = 0;
        for (JsonNode a : list) if (a.get("live").asBoolean()) live++;
        assertThat(live).isEqualTo(2);
    }

    @Test
    void desactiverEtLiensDangereuxRefuses() throws Exception {
        MockHttpSession admin = adminSession();
        JsonNode a = create(admin, input("Soldes", "landing", true));
        Map<String, Object> off = input("Soldes", "landing", false);
        mvc.perform(put("/api/admin/announcements/" + a.get("id").asText()).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(off))).andExpect(status().isOk()).andExpect(jsonPath("$.live").value(false));
        mvc.perform(get("/api/public/announcements/current").param("audience", "landing")).andExpect(status().isNoContent());

        for (String bad : new String[] {"javascript:alert(1)", "http://exemple.sn", "//evil.example", "data:text/html,x"}) {
            Map<String, Object> in = input("Lien", "landing", true);
            in.put("ctaLabel", "Clique");
            in.put("ctaUrl", bad);
            mvc.perform(post("/api/admin/announcements").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(in)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("ctaUrl"));
        }
        Map<String, Object> half = input("Bouton", "landing", true);
        half.put("ctaLabel", "Sans lien");
        mvc.perform(post("/api/admin/announcements").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(half)))
                .andExpect(status().isBadRequest());
        Map<String, Object> period = input("Période", "landing", true);
        period.put("startsAt", Instant.now().plus(2, ChronoUnit.DAYS).toString());
        period.put("endsAt", Instant.now().plus(1, ChronoUnit.DAYS).toString());
        mvc.perform(post("/api/admin/announcements").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(period)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("endsAt"));
        mvc.perform(get("/api/admin/announcements").session(register(uniqueHandle("nann")))).andExpect(status().isForbidden());
    }

    @Test
    void listeDesCollabs() throws Exception {
        MockHttpSession admin = adminSession();
        String h = uniqueHandle("coll");
        register(h);
        mvc.perform(put("/api/admin/referrers/" + h + "/collab").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("rateBps", 4500, "expiresAt", Instant.now().plus(10, ChronoUnit.DAYS).toString())))).andExpect(status().isOk());
        JsonNode list = getJson("/api/admin/collabs", admin);
        JsonNode mine = null;
        for (JsonNode c : list) if (c.get("handle").asText().equals(h)) mine = c;
        assertThat(mine).isNotNull();
        assertThat(mine.get("rateBps").asInt()).isEqualTo(4500);
        assertThat(mine.get("active").asBoolean()).isTrue();
        assertThat(list.get(0).get("active").asBoolean()).isTrue(); // en cours d'abord
    }
}
