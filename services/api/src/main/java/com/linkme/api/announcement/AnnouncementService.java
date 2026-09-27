package com.linkme.api.announcement;

import com.linkme.api.announcement.AnnouncementDtos.AdminAnnouncement;
import com.linkme.api.announcement.AnnouncementDtos.AnnouncementInput;
import com.linkme.api.announcement.AnnouncementDtos.PublicAnnouncement;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.SafeUrls;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Annonces en pop-up (D65) : une seule affichée par public, la plus récemment commencée parmi celles en ligne. */
@Service
public class AnnouncementService {
    /** Chemin interne (ex. /app/abonnement, /rejoindre) : pas de protocole, pas de « // », pas de caractères exotiques. */
    static final Pattern INTERNAL_PATH = Pattern.compile("^/(?!/)[A-Za-z0-9/_\\-.?=&#%]*$");

    private final AnnouncementRepository repo;
    private final Clock clock;

    public AnnouncementService(AnnouncementRepository repo, Clock clock) {
        this.repo = repo;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Optional<PublicAnnouncement> current(String where) {
        if (!"landing".equals(where) && !"dashboard".equals(where)) throw ApiException.validation("audience", "Public inconnu.");
        return repo.live(clock.instant()).stream().filter(a -> a.targets(where)).findFirst()
                .map(a -> new PublicAnnouncement(a.getId(), a.getTitle(), a.getBody(), a.getCtaLabel(), a.getCtaUrl()));
    }

    @Transactional(readOnly = true)
    public List<AdminAnnouncement> list() {
        Instant now = clock.instant();
        return repo.findAllByOrderByCreatedAtDesc().stream().map(a -> toAdmin(a, now)).toList();
    }

    @Transactional
    public AdminAnnouncement create(UUID adminId, AnnouncementInput in) {
        Instant now = clock.instant();
        Announcement a = new Announcement(adminId, now);
        apply(a, in, now);
        return toAdmin(repo.saveAndFlush(a), now);
    }

    @Transactional
    public AdminAnnouncement update(UUID id, AnnouncementInput in) {
        Announcement a = repo.findById(id).orElseThrow(ApiException::notFound);
        Instant now = clock.instant();
        apply(a, in, now);
        return toAdmin(a, now);
    }

    /** Lien du bouton : https (règles habituelles) ou chemin interne ; jamais javascript:, data:, http: ni //autre-site. */
    public static String validateCtaUrl(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String u = raw.trim();
        if (u.startsWith("/")) {
            if (!INTERNAL_PATH.matcher(u).matches()) throw ApiException.validation("ctaUrl", "Lien interne invalide.");
            return u;
        }
        return SafeUrls.require("ctaUrl", u);
    }

    private static void apply(Announcement a, AnnouncementInput in, Instant now) {
        String label = in.ctaLabel() == null || in.ctaLabel().isBlank() ? null : in.ctaLabel().trim();
        String url = validateCtaUrl(in.ctaUrl());
        if ((label == null) != (url == null))
            throw ApiException.validation(label == null ? "ctaLabel" : "ctaUrl", "Le bouton a besoin d'un texte et d'un lien.");
        Instant starts = in.startsAt() == null ? now : in.startsAt();
        if (in.endsAt() != null && !in.endsAt().isAfter(starts))
            throw ApiException.validation("endsAt", "La fin doit être après le début.");
        a.apply(in.title().trim(), in.body().trim(), label, url, in.audience(), starts, in.endsAt(), in.active(), now);
    }

    private static AdminAnnouncement toAdmin(Announcement a, Instant now) {
        return new AdminAnnouncement(a.getId(), a.getTitle(), a.getBody(), a.getCtaLabel(), a.getCtaUrl(), a.getAudience(), a.getStartsAt(),
                a.getEndsAt(), a.isActive(), a.live(now), a.getCreatedAt());
    }
}
