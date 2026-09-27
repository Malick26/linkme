package com.linkme.api.referral;

import com.linkme.api.subscription.SubscriptionService.SubscriptionPaid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Crédite le parrain APRÈS commit du paiement d'abonnement (D51) : l'abonnement du filleul est déjà activé, et un
 * incident ici (base indisponible, bug) ne remonte jamais au webhook du fournisseur. Le rattrapage quotidien
 * ({@link ReferralService#reconcile()}) retente les paiements restés sans gain.
 */
@Component
public class ReferralPaymentListener {
    private static final Logger log = LoggerFactory.getLogger(ReferralPaymentListener.class);
    private final ReferralService referrals;

    public ReferralPaymentListener(ReferralService referrals) {
        this.referrals = referrals;
    }

    @TransactionalEventListener
    public void onSubscriptionPaid(SubscriptionPaid event) {
        try {
            referrals.creditInNewTransaction(event.paymentId());
        } catch (RuntimeException e) {
            log.error("Parrainage : crédit impossible pour le paiement {} — rattrapage automatique à 00h20", event.paymentId(), e);
        }
    }
}
