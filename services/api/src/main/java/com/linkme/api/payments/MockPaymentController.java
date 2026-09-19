package com.linkme.api.payments;

import com.linkme.api.common.ApiException;
import com.linkme.api.config.AppProperties;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.shop.OrderRepository;
import com.linkme.api.shop.ShopOrder;
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

/** Page de paiement simulée (dev/tests uniquement) — permet l'e2e « achat complet » sans fournisseur réel. */
@RestController
public class MockPaymentController {
    private final MockPaymentProvider mock;
    private final PaymentService payments;
    private final OrderRepository orders;
    private final CreatorProfileRepository profiles;
    private final AppProperties props;

    public MockPaymentController(MockPaymentProvider mock, PaymentService payments, OrderRepository orders, CreatorProfileRepository profiles,
                                 AppProperties props) {
        this.mock = mock;
        this.payments = payments;
        this.orders = orders;
        this.profiles = profiles;
        this.props = props;
    }

    private ShopOrder order(String reference) {
        if (!mock.enabled() || !reference.matches("^LM-[A-Z0-9]{12}$")) throw ApiException.notFound();
        return orders.findByReference(reference).filter(o -> "mock".equals(o.getProvider())).orElseThrow(ApiException::notFound);
    }

    /** operationId: mockPaymentPage */
    @GetMapping(path = "/api/payments/mock/{reference}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> page(@PathVariable String reference) {
        ShopOrder o = order(reference);
        String ref = HtmlUtils.htmlEscape(o.getReference());
        String html = """
                <!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Paiement simulé</title><style>
                body{font-family:system-ui,sans-serif;background:#0e1016;color:#eef0f5;display:grid;place-items:center;min-height:100vh;margin:0}
                main{background:#161922;border:1px solid #2a2f3c;border-radius:16px;padding:28px;max-width:360px;width:calc(100% - 32px)}
                h1{font-size:18px;margin:0 0 4px}p{color:#a3aabb;margin:4px 0 16px}strong{color:#fff;font-size:22px}
                form{margin:8px 0}button{width:100%%;min-height:48px;border-radius:999px;border:0;font-weight:700;font-size:15px;cursor:pointer}
                .ok{background:#ffb067;color:#1a1206}.ko{background:#2a2f3c;color:#eef0f5}</style></head><body><main>
                <h1>Paiement simulé (mode test)</h1><p>%s × %d — réf. %s</p><strong>%s FCFA</strong><p></p>
                <form method="post" action="/api/payments/mock/%s/complete?outcome=success"><button class="ok" type="submit">Payer avec Wave (simulé)</button></form>
                <form method="post" action="/api/payments/mock/%s/complete?outcome=failure"><button class="ko" type="submit">Simuler un échec</button></form>
                <form method="post" action="/api/payments/mock/%s/complete?outcome=cancel"><button class="ko" type="submit">Annuler</button></form>
                </main></body></html>
                """.formatted(HtmlUtils.htmlEscape(o.getProductTitle()), o.getQuantity(), ref, String.format("%,d", o.getAmountXof()).replace(',', ' '), ref, ref, ref);
        return ResponseEntity.ok()
                .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    /** operationId: mockPaymentComplete — simule l'issue puis envoie la notification signée comme le ferait le fournisseur. */
    @PostMapping("/api/payments/mock/{reference}/complete")
    public ResponseEntity<Void> complete(@PathVariable String reference, @RequestParam String outcome) {
        ShopOrder o = order(reference);
        PaymentProvider.PaymentStatus status = switch (outcome) {
            case "success" -> PaymentProvider.PaymentStatus.PAID;
            case "failure" -> PaymentProvider.PaymentStatus.FAILED;
            case "cancel" -> PaymentProvider.PaymentStatus.CANCELED;
            default -> throw ApiException.validation("outcome", "Issue inconnue.");
        };
        payments.handleWebhook("mock", mock.settle(o.getReference(), status));
        String handle = profiles.findById(o.getCreatorId()).map(p -> p.getHandle()).orElse("");
        HttpHeaders h = new HttpHeaders();
        h.setLocation(URI.create(props.baseUrl() + "/" + handle + "/commande/" + o.getReference()));
        return new ResponseEntity<>(h, HttpStatus.SEE_OTHER);
    }
}
