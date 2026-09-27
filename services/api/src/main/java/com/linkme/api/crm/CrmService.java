package com.linkme.api.crm;

import com.linkme.api.auth.User;
import com.linkme.api.auth.UserRepository;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.common.Phones;
import com.linkme.api.config.AppProperties;
import com.linkme.api.crm.CrmDtos.CrmContact;
import com.linkme.api.crm.CrmDtos.CrmEmailRequest;
import com.linkme.api.crm.CrmDtos.CrmEmailResult;
import com.linkme.api.crm.CrmDtos.ProspectInput;
import com.linkme.api.mail.MailService;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CRM minimal (D60–D63) : prospects inscrits sur /rejoindre et créateurs segmentés par état d'abonnement. Les emails
 * partent en masse par SMTP (avec lien de désinscription obligatoire) ; WhatsApp passe par des liens wa.me
 * pré-remplis ouverts par l'admin (pas d'API Meta), chaque ouverture étant notée comme « dernier contact ».
 */
@Service
public class CrmService {
    static final int EXPIRING_SOON_DAYS = 7;
    static final int MAX_CONTACTS = 2_000;

    private final ProspectRepository prospects;
    private final CrmContactLogRepository logs;
    private final UserRepository users;
    private final CreatorProfileRepository profiles;
    private final MailService mail;
    private final AppProperties props;
    private final Clock clock;

    public CrmService(ProspectRepository prospects, CrmContactLogRepository logs, UserRepository users, CreatorProfileRepository profiles,
                      MailService mail, AppProperties props, Clock clock) {
        this.prospects = prospects;
        this.logs = logs;
        this.users = users;
        this.profiles = profiles;
        this.mail = mail;
        this.props = props;
        this.clock = clock;
    }

    // ───────────────────────────── Public

    /**
     * Inscription d'un prospect. Réponse identique qu'il soit nouveau ou déjà connu (pas d'énumération) ; un robot
     * qui remplit le champ piège est accepté en apparence et ignoré.
     */
    @Transactional
    public void join(ProspectInput in, String clientIp) {
        if (in.website() != null && !in.website().isBlank()) return;
        String email = in.email() == null || in.email().isBlank() ? null : in.email().trim().toLowerCase(Locale.ROOT);
        String phone = null;
        if (in.phone() != null && !in.phone().isBlank()) {
            if (!Phones.isValid(in.phone())) throw ApiException.validation("phone", "Numéro de téléphone invalide.");
            phone = Phones.normalize(in.phone());
        }
        if (email == null && phone == null) throw ApiException.validation("email", "Laisse au moins un email ou un numéro WhatsApp.");
        String name = in.name() == null || in.name().isBlank() ? null : in.name().trim();
        Instant now = clock.instant();

        Optional<Prospect> known = email != null ? prospects.findByEmailIgnoreCase(email) : Optional.empty();
        if (known.isEmpty() && phone != null) known = prospects.findByPhone(phone);
        if (known.isPresent()) {
            known.get().rejoin(name, email, phone, now);
            return;
        }
        String ipHash = clientIp == null ? null : Hashing.sha256Hex("prospect|" + clientIp + "|" + LocalDate.ofInstant(now, ZoneOffset.UTC));
        prospects.save(new Prospect(name, email, phone, Hashing.randomToken(24), ipHash, now));
    }

    /** Désinscription par le lien de l'email : réponse identique que le jeton existe ou non. */
    @Transactional
    public void unsubscribe(String token) {
        Instant now = clock.instant();
        String t = token.trim();
        Optional<Prospect> p = prospects.findByUnsubscribeToken(t);
        if (p.isPresent()) {
            p.get().unsubscribe(now);
            return;
        }
        users.findByUnsubscribeToken(t).ifPresent(u -> u.optOutOfMarketing(now));
    }

    // ───────────────────────────── Admin

    @Transactional(readOnly = true)
    public List<CrmContact> contacts(String segment) {
        List<CrmContact> list = "prospects".equals(segment) ? prospectContacts() : creatorContacts(segment);
        return withLastContact(list);
    }

    private List<CrmContact> prospectContacts() {
        return prospects.findAllByOrderByCreatedAtDesc().stream().limit(MAX_CONTACTS)
                .map(p -> new CrmContact("prospect", p.getId(), p.getName() == null ? "" : p.getName(), p.getEmail(), p.getPhone(), null, null,
                        null, p.getCreatedAt(), null, p.getUnsubscribedAt() != null))
                .toList();
    }

    private List<CrmContact> creatorContacts(String segment) {
        Instant now = clock.instant();
        List<CreatorProfile> selected = switch (segment) {
            case "never_subscribed" -> profiles.findBySubscriptionStatus("inactive");
            case "expired" -> profiles.findBySubscriptionStatus("expired");
            case "active" -> profiles.findBySubscriptionStatus("active");
            case "expiring_soon" -> profiles.findBySubscriptionStatus("active").stream()
                    .filter(p -> p.getSubscriptionExpiresAt() != null
                            && p.getSubscriptionExpiresAt().isBefore(now.plus(Duration.ofDays(EXPIRING_SOON_DAYS))))
                    .toList();
            default -> throw ApiException.validation("segment", "Segment inconnu.");
        };
        Map<UUID, User> byId = users.findAllById(selected.stream().map(CreatorProfile::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<CrmContact> out = new ArrayList<>();
        for (CreatorProfile p : selected) {
            User u = byId.get(p.getUserId());
            if (u == null || u.getDeletedAt() != null) continue;
            out.add(new CrmContact("creator", u.getId(), p.getDisplayName(), u.getEmail(), u.getPhone(), p.getHandle(), p.getSubscriptionStatus(),
                    p.getSubscriptionExpiresAt(), u.getCreatedAt(), null, u.getMarketingOptOutAt() != null));
        }
        // échéance proche : les plus urgents d'abord ; sinon les plus récents
        Comparator<CrmContact> order = "expiring_soon".equals(segment)
                ? Comparator.comparing(CrmContact::subscriptionExpiresAt, Comparator.nullsLast(Comparator.naturalOrder()))
                : Comparator.comparing(CrmContact::createdAt).reversed();
        return out.stream().sorted(order).limit(MAX_CONTACTS).toList();
    }

    private List<CrmContact> withLastContact(List<CrmContact> list) {
        if (list.isEmpty()) return list;
        String kind = list.get(0).kind();
        Map<UUID, Instant> last = logs.lastContacts(kind, list.stream().map(CrmContact::id).toList()).stream()
                .collect(Collectors.toMap(CrmContactLogRepository.LastContact::getContactId, CrmContactLogRepository.LastContact::getLastAt));
        return list.stream().map(c -> new CrmContact(c.kind(), c.id(), c.name(), c.email(), c.phone(), c.handle(), c.subscriptionStatus(),
                c.subscriptionExpiresAt(), c.createdAt(), last.get(c.id()), c.optedOut())).toList();
    }

    /** Remplace {nom} ; ajoute toujours le lien de désinscription (consentement, loi 2008-12). */
    public static String personalize(String body, String name, String unsubscribeUrl) {
        // sans nom connu, « Bonjour {nom}, » devient « Bonjour, » (on retire l'espace qui précède, rien d'autre)
        String text = name == null || name.isBlank() ? body.replaceAll("[ \\t]*\\{nom}", "") : body.replace("{nom}", name.trim());
        return text + "\n\n—\nTu reçois ce message car tu t'es inscrit·e sur LinkMe. Pour ne plus en recevoir : " + unsubscribeUrl;
    }

    @Transactional
    public CrmEmailResult sendEmail(UUID adminId, CrmEmailRequest req) {
        if (!mail.available()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_UNAVAILABLE", "L'envoi d'emails n'est pas configuré (SMTP).");
        Instant now = clock.instant();
        int sent = 0;
        int skipped = 0;
        String base = props.baseUrl() + "/desinscription?t=";
        if ("prospects".equals(req.segment())) {
            for (Prospect p : prospects.findAllByOrderByCreatedAtDesc()) {
                if (p.getEmail() == null || p.getUnsubscribedAt() != null) { skipped++; continue; }
                mail.send(p.getEmail(), req.subject(), personalize(req.body(), p.getName(), base + p.getUnsubscribeToken()));
                logs.save(new CrmContactLog("prospect", p.getId(), "email", adminId, req.subject(), now));
                sent++;
            }
        } else {
            for (CrmContact c : creatorContacts(req.segment())) {
                if (c.email() == null || c.optedOut()) { skipped++; continue; }
                User u = users.findById(c.id()).orElseThrow();
                String token = u.ensureUnsubscribeToken(() -> Hashing.randomToken(24));
                mail.send(c.email(), req.subject(), personalize(req.body(), c.name(), base + token));
                logs.save(new CrmContactLog("creator", c.id(), "email", adminId, req.subject(), now));
                sent++;
            }
        }
        return new CrmEmailResult(sent, skipped);
    }

    @Transactional
    public void log(UUID adminId, String kind, UUID contactId, String channel) {
        boolean exists = switch (kind) {
            case "prospect" -> prospects.existsById(contactId);
            case "creator" -> users.existsById(contactId);
            default -> false;
        };
        if (!exists) throw ApiException.notFound();
        logs.save(new CrmContactLog(kind, contactId, channel, adminId, null, clock.instant()));
    }
}
