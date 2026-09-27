package com.linkme.api.it;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;

/** Base des tests d'intégration : vraie base PostgreSQL (Testcontainers), migrations Flyway, seed /malick. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"dev", "test"})
public abstract class AbstractIT {
    /** Conteneur unique partagé par toutes les classes (le contexte Spring est mis en cache entre classes). */
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper mapper;

    protected String json(Object o) throws Exception {
        return mapper.writeValueAsString(o);
    }

    protected JsonNode body(MvcResult r) throws Exception {
        return mapper.readTree(r.getResponse().getContentAsString());
    }

    /** Inscrit un créateur unique et renvoie sa session authentifiée. */
    protected MockHttpSession register(String handle) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", handle + "-" + UUID.randomUUID().toString().substring(0, 6) + "@test.sn",
                                "password", "motdepasse-solide", "handle", handle, "displayName", "Créateur " + handle, "acceptTerms", true))))
                .andExpect(status().isCreated())
                .andReturn();
        return (MockHttpSession) r.getRequest().getSession(false);
    }

    /** Inscription avec un email et un code de parrainage choisis (null = sans parrain). */
    protected MockHttpSession register(String handle, String email, String referralCode) throws Exception {
        java.util.Map<String, Object> req = new java.util.HashMap<>(Map.of("email", email, "password", "motdepasse-solide", "handle", handle,
                "displayName", "Créateur " + handle, "acceptTerms", true));
        if (referralCode != null) req.put("referralCode", referralCode);
        MvcResult r = mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return (MockHttpSession) r.getRequest().getSession(false);
    }

    /** Session admin (email listé dans app.admin-emails du profil test) : inscrit le compte au premier appel, puis se connecte. */
    protected MockHttpSession adminSession() throws Exception {
        String email = "admin-it@test.sn";
        MvcResult reg = mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "motdepasse-admin", "handle", uniqueHandle("admin"),
                                "displayName", "Admin", "acceptTerms", true))))
                .andReturn();
        if (reg.getResponse().getStatus() == 201) return (MockHttpSession) reg.getRequest().getSession(false);
        MvcResult login = mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "motdepasse-admin"))))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) login.getRequest().getSession(false);
    }

    /** Paie une période d'abonnement avec le numéro donné (le parrainage compare les numéros, D54). */
    protected String paySubscription(MockHttpSession s, String plan, String phone) throws Exception {
        JsonNode checkout = body(mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("plan", plan, "phone", phone))))
                .andExpect(status().isOk()).andReturn());
        String reference = checkout.get("reference").asText();
        mvc.perform(post("/api/payments/mock/subscription/" + reference + "/complete").param("outcome", "success"))
                .andExpect(status().isSeeOther());
        return reference;
    }

    protected JsonNode getJson(String url, MockHttpSession session) throws Exception {
        return body(mvc.perform(get(url).session(session)).andExpect(status().isOk()).andReturn());
    }

    protected static String uniqueHandle(String prefix) {
        return (prefix + UUID.randomUUID().toString().replace("-", "")).substring(0, 20);
    }

    /**
     * Active un abonnement (D44) via le parcours mock complet (checkout + webhook simulé « succès »).
     * Pour les tests qui exigent une page publique visible mais n'exercent pas eux-mêmes le parcours d'abonnement.
     */
    protected String activateSubscription(MockHttpSession s, String plan) throws Exception {
        JsonNode checkout = body(mvc.perform(post("/api/me/subscription/checkout").session(s).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("plan", plan, "phone", "+221770000001"))))
                .andExpect(status().isOk()).andReturn());
        String reference = checkout.get("reference").asText();
        mvc.perform(post("/api/payments/mock/subscription/" + reference + "/complete").param("outcome", "success"))
                .andExpect(status().isSeeOther());
        return reference;
    }
}
