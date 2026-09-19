package com.linkme.api.payments;

import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reversement simulé (dev/tests). */
@Component
public class MockPayoutProvider implements PayoutProvider {
    @Override
    public String id() {
        return "mock";
    }

    @Override
    public boolean enabled() {
        return true;
    }

    @Override
    public PayoutResult payout(UUID creatorId, long amountXof, String destinationPhone, String idempotencyKey) {
        return new PayoutResult(true, "MOCK-PAYOUT-" + idempotencyKey, "simulé");
    }
}
