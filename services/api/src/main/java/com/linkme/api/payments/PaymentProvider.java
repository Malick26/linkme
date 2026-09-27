package com.linkme.api.payments;

import java.util.Map;

/**
 * Port d'un fournisseur de paiement mobile money (D9, ADR 0005). Un adaptateur n'est actif que si sa configuration
 * est complète ({@link #enabled()}). Généralisé à {@link Payable} (D47) : le même adaptateur encaisse une vente
 * boutique ({@code ShopOrder}) ou un paiement d'abonnement ({@code SubscriptionPayment}).
 */
public interface PaymentProvider {
    String id();

    boolean enabled();

    /** Crée la transaction chez le fournisseur et renvoie l'URL de paiement (redirection de l'acheteur). */
    PaymentInit initiate(Payable payable, PaymentUrls urls);

    /** Analyse une notification (IPN/webhook) : signature, référence, identifiant d'événement. Ne fait AUCUNE confiance au statut annoncé. */
    WebhookNotification parseWebhook(WebhookRequest request);

    /** Re-vérification serveur-à-serveur du statut réel et du montant encaissé (D24). */
    VerifiedPayment verify(Payable payable);

    record PaymentUrls(String returnUrl, String cancelUrl, String notifyUrl) {}

    record PaymentInit(String paymentUrl, String providerRef) {}

    record WebhookRequest(byte[] body, String contentType, Map<String, String> headers, Map<String, String> form) {
        public String header(String name) {
            return headers.get(name.toLowerCase());
        }
    }

    /**
     * @param eventId identifiant unique de l'événement (idempotence) ; si absent, un hash du corps est utilisé
     * @param claimedAmount montant annoncé dans la notification (contrôle de cohérence, jamais source de vérité)
     */
    record WebhookNotification(boolean signatureValid, String eventId, String reference, String type, Long claimedAmount) {}

    enum PaymentStatus { PENDING, PAID, FAILED, CANCELED }

    record VerifiedPayment(PaymentStatus status, Long amount, String currency) {}
}
