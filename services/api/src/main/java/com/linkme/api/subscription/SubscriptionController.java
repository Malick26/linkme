package com.linkme.api.subscription;

import com.linkme.api.auth.AppUser;
import com.linkme.api.subscription.SubscriptionDtos.PlanCatalogEntry;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionCheckoutRequest;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionCheckoutResponse;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionPaymentView;
import com.linkme.api.subscription.SubscriptionDtos.SubscriptionStatusDto;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SubscriptionController {
    private final SubscriptionService subscriptions;

    public SubscriptionController(SubscriptionService subscriptions) {
        this.subscriptions = subscriptions;
    }

    /** operationId: getSubscriptionPlans — public : sert la page tarifs. */
    @GetMapping("/api/subscriptions/plans")
    public List<PlanCatalogEntry> plans() {
        return subscriptions.catalog();
    }

    /** operationId: getMySubscription */
    @GetMapping("/api/me/subscription")
    public SubscriptionStatusDto status(@AuthenticationPrincipal AppUser me) {
        return subscriptions.status(me.id());
    }

    /** operationId: checkoutSubscription */
    @PostMapping("/api/me/subscription/checkout")
    public SubscriptionCheckoutResponse checkout(@AuthenticationPrincipal AppUser me, @Valid @RequestBody SubscriptionCheckoutRequest req) {
        return subscriptions.checkout(me.id(), req);
    }

    /** operationId: getSubscriptionPayment */
    @GetMapping("/api/me/subscription/payments/{reference}")
    public SubscriptionPaymentView payment(@AuthenticationPrincipal AppUser me, @PathVariable String reference) {
        return subscriptions.paymentStatus(me.id(), reference);
    }
}
