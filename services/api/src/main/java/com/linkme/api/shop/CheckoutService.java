package com.linkme.api.shop;

import com.linkme.api.auth.Handles;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.config.AppProperties;
import com.linkme.api.payments.PaymentProvider;
import com.linkme.api.payments.PaymentProviderRegistry;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.publicpage.PublicPageAssembler;
import com.linkme.api.shop.ShopDtos.CheckoutRequest;
import com.linkme.api.shop.ShopDtos.CheckoutResponse;
import com.linkme.api.shop.ShopDtos.OrderStatusView;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Checkout : commande PENDING avec commission figée, puis redirection vers le fournisseur (ADR 0005). */
@Service
public class CheckoutService {
    private final PublicPageAssembler assembler;
    private final ProductRepository products;
    private final OrderRepository orders;
    private final CreatorProfileRepository profiles;
    private final PaymentProviderRegistry registry;
    private final AppProperties props;
    private final Clock clock;

    public CheckoutService(PublicPageAssembler assembler, ProductRepository products, OrderRepository orders, CreatorProfileRepository profiles,
                           PaymentProviderRegistry registry, AppProperties props, Clock clock) {
        this.assembler = assembler;
        this.products = products;
        this.orders = orders;
        this.profiles = profiles;
        this.registry = registry;
        this.props = props;
        this.clock = clock;
    }

    @Transactional
    public CheckoutResponse checkout(String handle, CheckoutRequest req) {
        CreatorProfile creator = assembler.findPublished(Handles.normalize(handle)).orElseThrow(ApiException::notFound);
        // La boutique est réservée au plan Boutique (D45) : même défense en profondeur que côté lecture publique.
        if (!creator.isBoutique()) throw ApiException.notFound();
        // la clé du client est liée au numéro de l'acheteur : un tiers ne peut pas « rejouer » la clé de quelqu'un d'autre
        String idem = req.idempotencyKey() == null || req.idempotencyKey().isBlank() ? null
                : Hashing.sha256Hex(req.idempotencyKey().trim() + "|" + req.buyerPhone().replace(" ", "")).substring(0, 64);
        if (idem != null) {
            Optional<ShopOrder> existing = orders.findByCreatorIdAndIdempotencyKey(creator.getUserId(), idem);
            if (existing.isPresent()) {
                ShopOrder o = existing.get();
                return new CheckoutResponse(o.getReference(), o.getPaymentUrl(), o.getStatus(), o.getAmountXof());
            }
        }
        Product product = products.findLive(req.productId(), creator.getUserId()).filter(Product::isActive).orElseThrow(ApiException::notFound);
        int qty = req.quantity();
        if (!product.available(qty)) throw ApiException.conflict("OUT_OF_STOCK", "Ce produit n'est plus disponible.");
        PaymentProvider provider = registry.require(req.provider());

        long amount = Math.multiplyExact(product.getPriceXof(), (long) qty);
        Commission.Split split = Commission.split(amount, props.commissionPercent());
        Instant now = clock.instant();
        String email = req.buyerEmail() == null || req.buyerEmail().isBlank() ? null : req.buyerEmail().trim();
        ShopOrder order = new ShopOrder(Hashing.orderReference(), creator.getUserId(), product, qty, props.commissionPercent(), split,
                provider.id(), req.buyerName().trim(), req.buyerPhone().replace(" ", ""), email, idem, now);
        orders.saveAndFlush(order);

        String base = props.baseUrl();
        String back = base + "/" + creator.getHandle() + "/commande/" + order.getReference();
        PaymentProvider.PaymentInit init = provider.initiate(order,
                new PaymentProvider.PaymentUrls(back, back, base + "/api/webhooks/" + provider.id()));
        order.attachPayment(init.providerRef(), init.paymentUrl(), clock.instant());
        return new CheckoutResponse(order.getReference(), init.paymentUrl(), order.getStatus(), order.getAmountXof());
    }

    @Transactional(readOnly = true)
    public OrderStatusView status(String reference) {
        if (reference == null || !reference.matches("^LM-[A-Z0-9]{12}$")) throw ApiException.notFound();
        ShopOrder o = orders.findByReference(reference).orElseThrow(ApiException::notFound);
        CreatorProfile p = profiles.findById(o.getCreatorId()).orElseThrow(ApiException::notFound);
        return new OrderStatusView(o.getReference(), o.getStatus(), o.getAmountXof(), o.getProductTitle(), o.getQuantity(), p.getHandle(),
                p.getDisplayName(), o.getPaidAt());
    }
}
