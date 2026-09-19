package com.linkme.api.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linkme.api.auth.AppUser;
import com.linkme.api.auth.Handles;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.ClientIp;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.publicpage.PublicPageAssembler;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnalyticsController {
    private final AnalyticsService analytics;
    private final PublicPageAssembler assembler;
    private final ObjectMapper mapper;

    public AnalyticsController(AnalyticsService analytics, PublicPageAssembler assembler, ObjectMapper mapper) {
        this.analytics = analytics;
        this.assembler = assembler;
        this.mapper = mapper;
    }

    /** operationId: trackEvent — accepte JSON ou text/plain (sendBeacon sans pré-vol CORS). */
    @PostMapping(path = "/api/public/{handle}/events", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE})
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void track(@PathVariable String handle, @RequestBody String body, HttpServletRequest req) {
        if (body == null || body.length() > 2048) throw ApiException.badRequest("VALIDATION", "Événement invalide.");
        CreatorProfile p = assembler.findPublished(Handles.normalize(handle)).orElseThrow(ApiException::notFound);
        JsonNode n;
        try {
            n = mapper.readTree(body);
        } catch (Exception e) {
            throw ApiException.badRequest("VALIDATION", "Événement invalide.");
        }
        String type = n.path("type").asText("");
        if (!type.equals("page_view") && !type.equals("link_click")) throw ApiException.badRequest("VALIDATION", "Type d'événement invalide.");
        UUID blockId = null;
        if (n.hasNonNull("blockId")) {
            try {
                blockId = UUID.fromString(n.get("blockId").asText());
            } catch (IllegalArgumentException ignored) {
                // identifiant de bloc invalide : ignoré
            }
        }
        String hash = analytics.visitorHash(ClientIp.of(req), req.getHeader("User-Agent"), p.getUserId());
        analytics.record(p.getUserId(), type, blockId, n.path("target").asText(null), n.path("referrer").asText(null), hash);
    }

    /** operationId: getAnalytics */
    @GetMapping("/api/me/analytics")
    public AnalyticsService.Summary summary(@AuthenticationPrincipal AppUser me, @RequestParam(defaultValue = "7") int days) {
        return analytics.summary(me.id(), days == 30 ? 30 : 7);
    }
}
