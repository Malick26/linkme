package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class ThemeAndPublicPageIT extends AbstractIT {

    @Test
    void seedDemoMalickConformeALaMaquette() throws Exception {
        JsonNode p = body(mvc.perform(get("/api/public/malick")).andExpect(status().isOk()).andReturn());
        assertThat(p.at("/profile/displayName").asText()).isEqualTo("Malick Wane");
        assertThat(p.at("/profile/taglineLines/2").asText()).isEqualTo("Real progress.");
        assertThat(p.at("/stats/followers").asLong()).isEqualTo(245_000);
        assertThat(p.at("/socials")).hasSize(5);
        assertThat(p.at("/blocks")).hasSize(5);
        assertThat(p.at("/blocks/0/title").asText()).isEqualTo("Mes voyages");
        String bg = p.at("/theme/background/imageId").asText();
        assertThat(p.at("/images/" + bg + "/urlTemplate").asText()).isEqualTo("/seed/bg-sunset-{w}.webp");
        assertThat(p.at("/showBranding").asBoolean()).isTrue();
        assertThat(p.at("/seo/title").asText()).isEqualTo("Malick Wane — Travel • Lifestyle • Creator");

        JsonNode voyages = body(mvc.perform(get("/api/public/malick/blocks/voyages")).andExpect(status().isOk()).andReturn());
        assertThat(voyages.at("/items/0/embed/src").asText()).startsWith("https://www.youtube-nocookie.com/embed/");
        JsonNode shop = body(mvc.perform(get("/api/public/malick/blocks/shop")).andExpect(status().isOk()).andReturn());
        assertThat(shop.at("/products")).hasSize(2);
        mvc.perform(get("/api/public/inconnu-xyz")).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/malick/blocks/inexistant")).andExpect(status().isNotFound());
    }

    @Test
    void validationServeurDuTheme() throws Exception {
        MockHttpSession s = register(uniqueHandle("thm"));
        ObjectNode draft = (ObjectNode) getJson("/api/me/theme", s).get("draft");

        ObjectNode badColor = draft.deepCopy();
        ((ObjectNode) badColor.get("colors")).put("accent", "red; background:url(x)");
        mvc.perform(put("/api/me/theme").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(badColor.toString()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));

        ObjectNode badFont = draft.deepCopy();
        ((ObjectNode) badFont.get("typography")).put("display", "comic-sans");
        mvc.perform(put("/api/me/theme").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(badFont.toString()))
                .andExpect(status().isBadRequest());

        ObjectNode badRadius = draft.deepCopy();
        ((ObjectNode) badRadius.get("cards")).put("radius", 99);
        mvc.perform(put("/api/me/theme").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(badRadius.toString()))
                .andExpect(status().isBadRequest());

        // image d'un autre créateur (celle du seed) → refusée
        String foreign = body(mvc.perform(get("/api/public/malick")).andReturn()).at("/theme/background/imageId").asText();
        ObjectNode stolen = draft.deepCopy();
        ((ObjectNode) stolen.get("background")).put("imageId", foreign);
        mvc.perform(put("/api/me/theme").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(stolen.toString()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("background.imageId"));
    }

    @Test
    void brouillonPuisPublicationMetAJourLaPagePublique() throws Exception {
        String h = uniqueHandle("pub");
        MockHttpSession s = register(h);
        ObjectNode draft = (ObjectNode) getJson("/api/me/theme", s).get("draft");
        ((ObjectNode) draft.get("colors")).put("accent", "#7AA7FF");
        draft.put("preset", "custom");
        mvc.perform(put("/api/me/theme").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(draft.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.hasUnpublishedChanges").value(true));
        // aperçu : brouillon visible même non publié
        assertThat(getJson("/api/me/preview", s).at("/theme/colors/accent").asText()).isEqualTo("#7AA7FF");
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound());

        mvc.perform(post("/api/me/theme/publish").session(s).with(csrf())).andExpect(status().isOk())
                .andExpect(jsonPath("$.hasUnpublishedChanges").value(false)).andExpect(jsonPath("$.version").value(1));
        // publié mais sans abonnement actif → toujours masqué (D44)
        mvc.perform(get("/api/public/" + h)).andExpect(status().isNotFound());
        activateSubscription(s, "standard");
        JsonNode pub = body(mvc.perform(get("/api/public/" + h)).andExpect(status().isOk()).andReturn());
        assertThat(pub.at("/theme/colors/accent").asText()).isEqualTo("#7AA7FF");

        // modification du brouillon non publiée : la page publique ne change pas
        ((ObjectNode) draft.get("colors")).put("accent", "#5FE0A8");
        mvc.perform(put("/api/me/theme").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(draft.toString())).andExpect(status().isOk());
        assertThat(body(mvc.perform(get("/api/public/" + h)).andReturn()).at("/theme/colors/accent").asText()).isEqualTo("#7AA7FF");
    }

    @Test
    void presetsPublics() throws Exception {
        JsonNode presets = body(mvc.perform(get("/api/theme/presets")).andExpect(status().isOk()).andReturn());
        assertThat(presets).hasSize(5);
        assertThat(presets.get(0).get("id").asText()).isEqualTo("sunset");
    }

    @Test
    void blocsLiensEtOrdre() throws Exception {
        MockHttpSession s = register(uniqueHandle("blk"));
        mvc.perform(post("/api/me/blocks").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", "link", "title", "Mon site"))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/me/blocks").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", "link", "title", "Mon site", "url", "javascript:alert(1)"))))
                .andExpect(status().isBadRequest());
        JsonNode created = body(mvc.perform(post("/api/me/blocks").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("type", "link", "title", "Mon site", "url", "https://example.com", "icon", "link"))))
                .andExpect(status().isCreated()).andReturn());
        assertThat(created.get("slug").asText()).isEqualTo("mon-site");
        JsonNode list = getJson("/api/me/blocks", s);
        StringBuilder ids = new StringBuilder("[");
        for (int i = list.size() - 1; i >= 0; i--) ids.append('"').append(list.get(i).get("id").asText()).append('"').append(i > 0 ? "," : "");
        ids.append(']');
        JsonNode reordered = body(mvc.perform(put("/api/me/blocks/order").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":" + ids + "}")).andExpect(status().isOk()).andReturn());
        assertThat(reordered.get(0).get("slug").asText()).isEqualTo("mon-site");
        // liste incomplète → 400
        mvc.perform(put("/api/me/blocks/order").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void contactEtAnalytics() throws Exception {
        mvc.perform(post("/api/public/malick/contact").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("name", "Awa", "message", "Bonjour !")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/public/malick/contact").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("name", "Awa", "email", "awa@test.sn", "message", "Collab ?")))).andExpect(status().isAccepted());
        mvc.perform(post("/api/public/malick/events").contentType(MediaType.TEXT_PLAIN).content("{\"type\":\"page_view\"}"))
                .andExpect(status().isAccepted());
        mvc.perform(post("/api/public/malick/events").contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"link_click\",\"target\":\"block:voyages\"}"))
                .andExpect(status().isAccepted());
        mvc.perform(post("/api/public/malick/events").contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"hack\"}"))
                .andExpect(status().isBadRequest());
    }
}
