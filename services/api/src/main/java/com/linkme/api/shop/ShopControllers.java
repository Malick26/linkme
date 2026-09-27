package com.linkme.api.shop;

import com.linkme.api.auth.AppUser;
import com.linkme.api.auth.Handles;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.PageMeta;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.publicpage.PublicPageAssembler;
import com.linkme.api.shop.ShopDtos.CheckoutRequest;
import com.linkme.api.shop.ShopDtos.CheckoutResponse;
import com.linkme.api.shop.ShopDtos.Earnings;
import com.linkme.api.shop.ShopDtos.OrderDto;
import com.linkme.api.shop.ShopDtos.OrderPage;
import com.linkme.api.shop.ShopDtos.OrderStatusView;
import com.linkme.api.shop.ShopDtos.ProductDto;
import com.linkme.api.shop.ShopDtos.ProductInput;
import com.linkme.api.shop.ShopDtos.PublicProductDto;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints boutique : gestion créateur (/api/me/…) et parcours acheteur public (/api/public/…). */
@RestController
public class ShopControllers {
    private final ProductService products;
    private final CheckoutService checkout;
    private final EarningsService earnings;
    private final OrderRepository orders;
    private final PublicPageAssembler assembler;

    public ShopControllers(ProductService products, CheckoutService checkout, EarningsService earnings, OrderRepository orders,
                           PublicPageAssembler assembler) {
        this.products = products;
        this.checkout = checkout;
        this.earnings = earnings;
        this.orders = orders;
        this.assembler = assembler;
    }

    /** operationId: listProducts */
    @GetMapping("/api/me/products")
    public List<ProductDto> list(@AuthenticationPrincipal AppUser me) {
        return products.list(me.id());
    }

    /** operationId: createProduct */
    @PostMapping("/api/me/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDto create(@AuthenticationPrincipal AppUser me, @Valid @RequestBody ProductInput in) {
        return products.create(me.id(), in);
    }

    /** operationId: updateProduct */
    @PutMapping("/api/me/products/{productId}")
    public ProductDto update(@AuthenticationPrincipal AppUser me, @PathVariable UUID productId, @Valid @RequestBody ProductInput in) {
        return products.update(me.id(), productId, in);
    }

    /** operationId: deleteProduct */
    @DeleteMapping("/api/me/products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AppUser me, @PathVariable UUID productId) {
        products.delete(me.id(), productId);
    }

    /** operationId: listOrders */
    @GetMapping("/api/me/orders")
    public OrderPage orders(@AuthenticationPrincipal AppUser me, @RequestParam(required = false) Integer page,
                            @RequestParam(required = false) Integer size, @RequestParam(required = false) OrderStatus status) {
        PageRequest pr = PageRequest.of(PageMeta.clampPage(page), PageMeta.clampSize(size));
        Page<ShopOrder> p = status == null ? orders.findByCreatorIdOrderByCreatedAtDesc(me.id(), pr)
                : orders.findByCreatorIdAndStatusOrderByCreatedAtDesc(me.id(), status, pr);
        return new OrderPage(p.getContent().stream().map(ShopControllers::toDto).toList(), PageMeta.of(p));
    }

    static OrderDto toDto(ShopOrder o) {
        return new OrderDto(o.getId(), o.getReference(), o.getStatus(), o.getAmountXof(), o.getCommissionXof(), o.getNetXof(), o.getProvider(),
                o.getProductTitle(), o.getQuantity(), o.getBuyerName(), o.getBuyerPhone(), o.getBuyerEmail(), o.getPayoutStatus(),
                o.isNeedsAttention(), o.getCreatedAt(), o.getPaidAt());
    }

    /** operationId: getEarnings */
    @GetMapping("/api/me/earnings")
    public Earnings earnings(@AuthenticationPrincipal AppUser me) {
        return earnings.earnings(me.id());
    }

    /** operationId: getPublicProduct */
    @GetMapping("/api/public/{handle}/products/{productId}")
    public ResponseEntity<PublicProductDto> publicProduct(@PathVariable String handle, @PathVariable UUID productId) {
        CreatorProfile p = assembler.findPublished(Handles.normalize(handle)).orElseThrow(ApiException::notFound);
        if (!p.isBoutique()) throw ApiException.notFound(); // D45 : boutique réservée au plan Boutique
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(products.publicGet(p.getUserId(), productId));
    }

    /** operationId: checkout */
    @PostMapping("/api/public/{handle}/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public CheckoutResponse checkout(@PathVariable String handle, @Valid @RequestBody CheckoutRequest req) {
        return checkout.checkout(handle, req);
    }

    /** operationId: getOrderStatus */
    @GetMapping("/api/public/orders/{reference}")
    public ResponseEntity<OrderStatusView> status(@PathVariable String reference) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(checkout.status(reference));
    }
}
