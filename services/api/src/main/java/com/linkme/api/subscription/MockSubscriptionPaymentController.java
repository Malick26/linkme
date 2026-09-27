package com.linkme.api.subscription;

import com.linkme.api.common.ApiException;
import com.linkme.api.payments.MockPaymentProvider;
import com.linkme.api.payments.PaymentProvider;
import com.linkme.api.payments.PaymentService;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

/** Page de paiement simulée pour un abonnement (dev/tests uniquement) — même principe que {@code MockPaymentController}. */
@RestController
public class MockSubscriptionPaymentController {
    private final MockPaymentProvider mock;
    private final PaymentService payments;
    private final SubscriptionPaymentRepository subscriptionPayments;

    public MockSubscriptionPaymentController(MockPaymentProvider mock, PaymentService payments, SubscriptionPaymentRepository subscriptionPayments) {
        this.mock = mock;
        this.payments = payments;
        this.subscriptionPayments = subscriptionPayments;
    }

    private SubscriptionPayment payment(String reference) {
        if (!mock.enabled() || !reference.matches("^SB-[A-Z0-9]{12}$")) throw ApiException.notFound();
        return subscriptionPayments.findByReference(reference).filter(p -> "mock".equals(p.getProvider())).orElseThrow(ApiException::notFound);
    }

    /** operationId: mockSubscriptionPaymentPage */
    @GetMapping(path = "/api/payments/mock/subscription/{reference}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> page(@PathVariable String reference) {
        SubscriptionPayment p = payment(reference);
        String ref = HtmlUtils.htmlEscape(p.getReference());
        String html = """
                <!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Paiement simulé</title><style>
                body{font-family:system-ui,sans-serif;background:#0e1016;color:#eef0f5;display:grid;place-items:center;min-height:100vh;margin:0}
                main{background:#161922;border:1px solid #2a2f3c;border-radius:16px;padding:28px;max-width:360px;width:calc(100% - 32px)}
                h1{font-size:18px;margin:0 0 4px}p{color:#a3aabb;margin:4px 0 16px}strong{color:#fff;font-size:22px}
                form{margin:8px 0}button{width:100%%;min-height:48px;border-radius:999px;border:0;font-weight:700;font-size:15px;cursor:pointer}
                .ok{background:#ffb067;color:#1a1206}.ko{background:#2a2f3c;color:#eef0f5}</style></head><body><main>
                <h1>Paiement simulé (mode test)</h1><p>%s — réf. %s</p><strong>%s FCFA</strong><p></p>
                <form method="post" action="/api/payments/mock/subscription/%s/complete?outcome=success"><button class="ok" type="submit">Payer avec Wave (simulé)</button></form>
                <form method="post" action="/api/payments/mock/subscription/%s/complete?outcome=failure"><button class="ko" type="submit">Simuler un échec</button></form>
                <form method="post" action="/api/payments/mock/subscription/%s/complete?outcome=cancel"><button class="ko" type="submit">Annuler</button></form>
                </main></body></html>
                """.formatted(HtmlUtils.htmlEscape(p.checkoutDescription()), ref, String.format("%,d", p.getAmountXof()).replace(',', ' '), ref, ref, ref);
        return ResponseEntity.ok()
                .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    /** operationId: mockSubscriptionPaymentComplete */
    @PostMapping("/api/payments/mock/subscription/{reference}/complete")
    public ResponseEntity<Void> complete(@PathVariable String reference, @RequestParam String outcome) {
        SubscriptionPayment p = payment(reference);
        PaymentProvider.PaymentStatus status = switch (outcome) {
            case "success" -> PaymentProvider.PaymentStatus.PAID;
            case "failure" -> PaymentProvider.PaymentStatus.FAILED;
            case "cancel" -> PaymentProvider.PaymentStatus.CANCELED;
            default -> throw ApiException.validation("outcome", "Issue inconnue.");
        };
        payments.handleWebhook("mock", mock.settle(p.getReference(), status));
        HttpHeaders h = new HttpHeaders();
        h.setLocation(URI.create("/app/abonnement/" + p.getReference()));
        return new ResponseEntity<>(h, HttpStatus.SEE_OTHER);
    }
}
