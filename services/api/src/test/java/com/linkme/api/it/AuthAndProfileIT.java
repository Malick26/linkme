package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class AuthAndProfileIT extends AbstractIT {

    @Test
    void inscriptionCreeProfilThemeEtBlocsParDefaut() throws Exception {
        String h = uniqueHandle("awa");
        MockHttpSession s = register(h);
        JsonNode me = getJson("/api/me", s);
        assertThat(me.get("handle").asText()).isEqualTo(h);
        assertThat(me.get("published").asBoolean()).isFalse();
        assertThat(getJson("/api/me/blocks", s)).hasSize(5);
        assertThat(getJson("/api/me/theme", s).get("draft").get("preset").asText()).isEqualTo("sunset");
        // page non publiée → 404 public
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void handleReserveEtDoublon() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "x@test.sn", "password", "motdepasse-solide", "handle", "admin", "displayName", "X", "acceptTerms", true))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDLE_RESERVED"));
        String h = uniqueHandle("dup");
        register(h);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "y@test.sn", "password", "motdepasse-solide", "handle", h, "displayName", "Y", "acceptTerms", true))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("HANDLE_TAKEN"));
        mvc.perform(get("/api/auth/handle-availability").param("handle", h)).andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void csrfObligatoireEt401SansSession() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void connexionEtMauvaisMotDePasse() throws Exception {
        String h = uniqueHandle("log");
        String email = h + "@login.sn";
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", email, "password", "motdepasse-solide", "handle", h, "displayName", "L", "acceptTerms", true))))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "mauvais-mot-de-passe"))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("BAD_CREDENTIALS"));
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email.toUpperCase(), "password", "motdepasse-solide"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.handle").value(h));
    }

    @Test
    void profilReseauxStatsEtValidation() throws Exception {
        MockHttpSession s = register(uniqueHandle("pro"));
        mvc.perform(put("/api/me/profile").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("displayName", "Fatou", "taglineLines", List.of("Big dreams", "", "Real progress."),
                                "categories", List.of("Travel", "Food"), "bio", "Dakar ↔ Paris"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.taglineLines.length()").value(2));
        // bio > 160 caractères → 400
        mvc.perform(put("/api/me/profile").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("displayName", "F", "taglineLines", List.of(), "categories", List.of(), "bio", "x".repeat(161)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));
        // URL javascript: refusée
        mvc.perform(put("/api/me/socials").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("items", List.of(Map.of("platform", "tiktok", "url", "javascript:alert(1)", "followersCount", 10))))))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/me/socials").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("items", List.of(Map.of("platform", "tiktok", "url", "https://www.tiktok.com/@f", "followersCount", 245000))))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].followersCount").value(245000));
        mvc.perform(put("/api/me/stats").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("followers", 245000, "likes", 8400000, "views30d", 12000000))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void suppressionDeCompte() throws Exception {
        String h = uniqueHandle("del");
        MockHttpSession s = register(h);
        mvc.perform(delete("/api/me").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", "faux-mot-de-passe"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/me").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("password", "motdepasse-solide"))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/handle-availability").param("handle", h)).andExpect(jsonPath("$.available").value(true));
    }
}
