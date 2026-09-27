package com.linkme.api.payments;

import java.util.UUID;

/**
 * Ce qu'un {@link PaymentProvider} a besoin de savoir pour encaisser, quelle que soit la nature de l'argent : une
 * vente boutique ({@code ShopOrder}) ou le paiement d'une période d'abonnement ({@code SubscriptionPayment}) (D47).
 * Évite de dupliquer la vérification serveur-à-serveur / signature / idempotence pour chaque nouveau flux d'argent.
 */
public interface Payable {
    String getReference();

    UUID getCreatorId();

    long getAmountXof();

    String getCurrency();

    String getProvider();

    String getProviderRef();

    /** Libellé court envoyé au fournisseur (facture/description affichée à l'acheteur). */
    String checkoutDescription();

    String buyerName();

    String buyerPhone();
}
