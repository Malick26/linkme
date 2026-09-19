package com.linkme.api.payments;

import com.linkme.api.common.ApiException;
import com.linkme.api.config.AppProperties;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PaymentProviderRegistry {
    private final Map<String, PaymentProvider> providers;
    private final String defaultProvider;

    public PaymentProviderRegistry(List<PaymentProvider> providers, AppProperties props) {
        this.providers = providers.stream().collect(Collectors.toMap(PaymentProvider::id, Function.identity()));
        this.defaultProvider = props.payments().defaultProvider();
    }

    /** Fournisseur actif, sinon 503 PAYMENT_UNAVAILABLE. */
    public PaymentProvider require(String id) {
        String key = id == null || id.isBlank() ? defaultProvider : id;
        PaymentProvider p = providers.get(key);
        if (p == null || !p.enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_UNAVAILABLE", "Le paiement est momentanément indisponible.");
        }
        return p;
    }

    /** Pour les webhooks : fournisseur inconnu/inactif → 404 (pas d'information divulguée). */
    public PaymentProvider forWebhook(String id) {
        PaymentProvider p = providers.get(id);
        if (p == null || !p.enabled()) throw ApiException.notFound();
        return p;
    }
}
