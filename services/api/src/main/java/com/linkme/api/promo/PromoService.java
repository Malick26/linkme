package com.linkme.api.promo;

import com.linkme.api.common.ApiException;
import com.linkme.api.config.AppProperties;
import com.linkme.api.promo.PromoDtos.AdminPromoCode;
import com.linkme.api.promo.PromoDtos.PromoCodeInput;
import com.linkme.api.promo.PromoDtos.PromoQuote;
import com.linkme.api.subscription.SubscriptionPaymentRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Codes promo sur les abonnements (D59). Le code est vérifié et la réduction figée au checkout ; l'usage n'est compté
 * qu'au paiement effectif (un paiement abandonné ne « brûle » pas un usage). Un créateur n'utilise un code qu'une fois.
 */
@Service
public class PromoService {
    private static final Logger log = LoggerFactory.getLogger(PromoService.class);

    private final PromoCodeRepository codes;
    private final SubscriptionPaymentRepository payments;
    private final AppProperties props;
    private final Clock clock;

    public PromoService(PromoCodeRepository codes, SubscriptionPaymentRepository payments, AppProperties props, Clock clock) {
        this.codes = codes;
        this.payments = payments;
        this.props = props;
        this.clock = clock;
    }

    /** Réduction applicable (ou erreur explicite, jamais d'application silencieuse d'un code refusé). */
    public record Applied(PromoCode code, long discountXof) {}

    @Transactional(readOnly = true)
    public Applied resolve(UUID creatorId, String rawCode, String plan) {
        PromoCode p = codes.findByCode(PromoCode.normalize(rawCode))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PROMO_INVALID", "Ce code promo n'existe pas."));
        switch (p.availability(clock.instant())) {
            case INACTIVE -> throw new ApiException(HttpStatus.NOT_FOUND, "PROMO_INVALID", "Ce code promo n'existe pas.");
            case EXPIRED -> throw ApiException.conflict("PROMO_EXPIRED", "Ce code promo a expiré.");
            case EXHAUSTED -> throw ApiException.conflict("PROMO_EXHAUSTED", "Ce code promo a atteint son nombre d'utilisations.");
            case OK -> { }
        }
        if (payments.existsActiveUseOfPromo(creatorId, p.getId()))
            throw ApiException.conflict("PROMO_ALREADY_USED", "Tu as déjà utilisé ce code promo.");
        return new Applied(p, PromoCode.discount(props.subscription().priceFor(plan), p.getPercentOff()));
    }

    @Transactional(readOnly = true)
    public PromoQuote quote(UUID creatorId, String rawCode, String plan) {
        if (!"standard".equals(plan) && !"boutique".equals(plan)) throw ApiException.validation("plan", "Plan inconnu.");
        Applied a = resolve(creatorId, rawCode, plan);
        long price = props.subscription().priceFor(plan);
        return new PromoQuote(a.code().getCode(), a.code().getPercentOff(), plan, price, a.discountXof(), price - a.discountXof());
    }

    /** Appelé quand un paiement portant ce code devient PAID (webhook re-vérifié ou paiement à 0 FCFA). */
    @Transactional
    public void recordUse(UUID promoCodeId) {
        Instant now = clock.instant();
        codes.lock(promoCodeId).ifPresent(p -> {
            // prix déjà annoncé au créateur : on l'honore même si d'autres paiements en attente ont épuisé le code entre-temps
            if (p.getUsesCount() >= p.getMaxUses()) log.warn("Code promo {} : usage honoré au-delà du maximum ({})", p.getCode(), p.getMaxUses());
            p.recordUse(now);
        });
    }

    // ───────────────────────────── Admin

    @Transactional(readOnly = true)
    public List<AdminPromoCode> list() {
        return codes.findAllByOrderByCreatedAtDesc().stream().map(AdminPromoCode::of).toList();
    }

    @Transactional
    public AdminPromoCode create(UUID adminId, PromoCodeInput in) {
        Instant now = clock.instant();
        if (in.validUntil() != null && !in.validUntil().isAfter(now))
            throw ApiException.validation("validUntil", "La date de fin doit être dans le futur.");
        String code = PromoCode.normalize(in.code());
        if (codes.existsByCode(code)) throw ApiException.conflict("PROMO_CODE_TAKEN", "Ce code existe déjà.");
        return AdminPromoCode.of(codes.saveAndFlush(new PromoCode(code, in.percentOff(), in.maxUses(), in.validUntil(), adminId, now)));
    }

    @Transactional
    public AdminPromoCode deactivate(UUID id) {
        PromoCode p = codes.findById(id).orElseThrow(ApiException::notFound);
        p.deactivate(clock.instant());
        return AdminPromoCode.of(p);
    }
}
