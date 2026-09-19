package com.linkme.api.payments;

import java.util.UUID;

/**
 * Port de reversement aux créateurs (D25). V1 : déclenchement manuel/administrateur — aucune exécution automatique
 * (action irréversible et payante). Interface prête pour Wave Business / Orange Money API.
 */
public interface PayoutProvider {
    String id();

    boolean enabled();

    PayoutResult payout(UUID creatorId, long amountXof, String destinationPhone, String idempotencyKey);

    record PayoutResult(boolean accepted, String providerRef, String message) {}
}
