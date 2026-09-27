package com.linkme.api.subscription;

import com.linkme.api.auth.User;
import com.linkme.api.auth.UserRepository;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.common.Phones;
import com.linkme.api.config.AppProperties;
import com.linkme.api.payments.PaymentProvider;
import com.linkme.api.payments.PaymentProviderRegistry;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.promo.PromoService;
import com.linkme.api.subscription.SubscriptionDtos.PlanCatalogEntry;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionCheckoutRequest;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionCheckoutResponse;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionStatusDto;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Abonnement obligatoire pour la visibilité publique (D44). Pas de prélèvement récurrent : payer une période
 * (30 jours) prolonge l'échéance ; une tâche planifiée repasse « active » à « expired » une fois dépassée (D46).
 */
@Service
public class SubscriptionService {
    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final CreatorProfileRepository profiles;
    private final UserRepository users;
    private final SubscriptionPaymentRepository payments;
    private final PaymentProviderRegistry registry;
    private final AppProperties props;
    private final ApplicationEventPublisher publisher;
    private final PromoService promos;
    private final Clock clock;

    /** Publié quand un paiement d'abonnement vient d'activer/prolonger l'abonnement (le parrainage l'écoute après commit). */
    public record SubscriptionPaid(UUID paymentId, UUID creatorId) {}

    public SubscriptionService(CreatorProfileRepository profiles, UserRepository users, SubscriptionPaymentRepository payments,
                               PaymentProviderRegistry registry, AppProperties props, ApplicationEventPublisher publisher, PromoService promos,
                               Clock clock) {
        this.profiles = profiles;
        this.users = users;
        this.payments = payments;
        this.registry = registry;
        this.props = props;
        this.publisher = publisher;
        this.promos = promos;
        this.clock = clock;
    }

    public List<PlanCatalogEntry> catalog() {
        AppProperties.Subscription s = props.subscription();
        return List.of(
                new PlanCatalogEntry("standard", s.standardPriceXof(), s.periodDays(), false),
                new PlanCatalogEntry("boutique", s.boutiquePriceXof(), s.periodDays(), true));
    }

    @Transactional(readOnly = true)
    public SubscriptionStatusDto status(UUID creatorId) {
        CreatorProfile p = profiles.findById(creatorId).orElseThrow(ApiException::notFound);
        Instant now = clock.instant();
        Long daysRemaining = p.getSubscriptionExpiresAt() == null ? null
                : Math.max(0, Duration.between(now, p.getSubscriptionExpiresAt()).toDays());
        return new SubscriptionStatusDto(p.getPlan(), p.getSubscriptionStatus(), "active".equals(p.getSubscriptionStatus()),
                p.getSubscriptionExpiresAt(), daysRemaining);
    }

    @Transactional
    public SubscriptionCheckoutResponse checkout(UUID creatorId, SubscriptionCheckoutRequest req) {
        CreatorProfile creator = profiles.findById(creatorId).orElseThrow(ApiException::notFound);
        String phone = Phones.normalize(req.phone());
        if (!Phones.isValid(phone)) throw ApiException.validation("phone", "Numéro de téléphone invalide.");
        Instant now = clock.instant();
        User user = users.findById(creatorId).orElseThrow(ApiException::notFound);
        if (user.getPhone() == null || user.getPhone().isBlank()) user.setPhone(phone, now);

        // la clé du client est liée au numéro : un tiers ne peut pas « rejouer » la clé de quelqu'un d'autre (même règle que le checkout boutique)
        String idem = req.idempotencyKey() == null || req.idempotencyKey().isBlank() ? null
                : Hashing.sha256Hex(req.idempotencyKey().trim() + "|" + phone).substring(0, 64);
        if (idem != null) {
            Optional<SubscriptionPayment> existing = payments.findByCreatorIdAndIdempotencyKey(creatorId, idem);
            if (existing.isPresent()) {
                SubscriptionPayment p = existing.get();
                return new SubscriptionCheckoutResponse(p.getReference(), p.getPaymentUrl(), p.getStatus(), p.getAmountXof(), p.getDiscountXof());
            }
        }
        // code promo vérifié AVANT tout appel au fournisseur : un code refusé l'est explicitement (D59)
        PromoService.Applied promo = req.promoCode() == null || req.promoCode().isBlank() ? null : promos.resolve(creatorId, req.promoCode(), req.plan());
        long amount = props.subscription().priceFor(req.plan());
        boolean free = promo != null && promo.discountXof() >= amount;
        PaymentProvider provider = free ? null : registry.require(req.provider());
        SubscriptionPayment payment = new SubscriptionPayment(creatorId, req.plan(), props.subscription().periodDays(), amount,
                free ? "promo" : provider.id(), creator.getDisplayName(), phone, idem, now);
        if (promo != null) payment.applyPromo(promo.code().getId(), promo.discountXof());
        payments.saveAndFlush(payment);

        if (free) {
            // 100 % de réduction : rien à encaisser, activation immédiate sans passer par un fournisseur
            payment.transition(SubscriptionPaymentStatus.PAID, now);
            activate(payment, now);
            return new SubscriptionCheckoutResponse(payment.getReference(), null, payment.getStatus(), 0L, payment.getDiscountXof());
        }

        String base = props.baseUrl();
        String back = base + "/app/abonnement/" + payment.getReference();
        PaymentProvider.PaymentInit init = provider.initiate(payment,
                new PaymentProvider.PaymentUrls(back, back, base + "/api/webhooks/" + provider.id()));
        payment.attachPayment(init.providerRef(), init.paymentUrl(), clock.instant());
        return new SubscriptionCheckoutResponse(payment.getReference(), init.paymentUrl(), payment.getStatus(), payment.getAmountXof(),
                payment.getDiscountXof());
    }

    @Transactional(readOnly = true)
    public SubscriptionDtos.SubscriptionPaymentView paymentStatus(UUID creatorId, String reference) {
        if (reference == null || !reference.matches("^SB-[A-Z0-9]{12}$")) throw ApiException.notFound();
        SubscriptionPayment p = payments.findByReference(reference).filter(x -> x.getCreatorId().equals(creatorId)).orElseThrow(ApiException::notFound);
        return new SubscriptionDtos.SubscriptionPaymentView(p.getReference(), p.getStatus(), p.getPlan(), p.getAmountXof(), p.getPaidAt());
    }

    /** Appelé par {@code PaymentService} quand un paiement d'abonnement passe à PAID (webhook re-vérifié). */
    @Transactional
    public void activate(SubscriptionPayment payment, Instant now) {
        CreatorProfile creator = profiles.findById(payment.getCreatorId()).orElseThrow(ApiException::notFound);
        creator.activateSubscription(payment.getPlan(), payment.getPeriodDays(), now);
        if (payment.getPromoCodeId() != null) promos.recordUse(payment.getPromoCodeId());
        // la commission du parrain est calculée APRÈS commit, dans sa propre transaction : un incident côté
        // parrainage ne doit jamais empêcher l'activation d'un abonnement payé (D51)
        publisher.publishEvent(new SubscriptionPaid(payment.getId(), payment.getCreatorId()));
    }

    /** Bascule quotidienne : les abonnements « active » dont l'échéance est dépassée deviennent « expired » (D46). */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void expireDueSubscriptions() {
        Instant now = clock.instant();
        List<CreatorProfile> due = profiles.findBySubscriptionStatusAndSubscriptionExpiresAtBefore("active", now);
        due.forEach(p -> p.expireIfDue(now));
        if (!due.isEmpty()) log.info("{} abonnement(s) expiré(s) (échéance dépassée).", due.size());
    }
}
