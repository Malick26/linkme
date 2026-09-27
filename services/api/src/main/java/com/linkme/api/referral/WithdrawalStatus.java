package com.linkme.api.referral;

public enum WithdrawalStatus {
    REQUESTED, PAID, REJECTED;

    public boolean isFinal() {
        return this != REQUESTED;
    }
}
