package com.linkme.api.subscription;

/** PENDING → PAID | FAILED | CANCELED ; les états finaux sont immuables (même règle que les commandes boutique). */
public enum SubscriptionPaymentStatus {
    PENDING, PAID, FAILED, CANCELED;

    public boolean isFinal() {
        return this != PENDING;
    }
}
