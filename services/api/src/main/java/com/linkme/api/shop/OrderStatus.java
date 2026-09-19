package com.linkme.api.shop;

/** PENDING → PAID | FAILED | CANCELED ; les états finaux sont immuables. */
public enum OrderStatus {
    PENDING, PAID, FAILED, CANCELED;

    public boolean isFinal() {
        return this != PENDING;
    }
}
