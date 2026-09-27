package com.linkme.api.promo;

import com.linkme.api.auth.AppUser;
import com.linkme.api.promo.PromoDtos.AdminPromoCode;
import com.linkme.api.promo.PromoDtos.PromoCodeInput;
import com.linkme.api.promo.PromoDtos.PromoQuote;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PromoController {
    private final PromoService promos;

    public PromoController(PromoService promos) {
        this.promos = promos;
    }

    /** operationId: quotePromoCode */
    @GetMapping("/api/me/subscription/promo")
    public PromoQuote quote(@AuthenticationPrincipal AppUser me, @RequestParam String code, @RequestParam String plan) {
        return promos.quote(me.id(), code, plan);
    }

    /** operationId: adminListPromoCodes */
    @GetMapping("/api/admin/promo-codes")
    public List<AdminPromoCode> list() {
        return promos.list();
    }

    /** operationId: adminCreatePromoCode */
    @PostMapping("/api/admin/promo-codes")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPromoCode create(@AuthenticationPrincipal AppUser admin, @Valid @RequestBody PromoCodeInput in) {
        return promos.create(admin.id(), in);
    }

    /** operationId: adminDeactivatePromoCode */
    @PostMapping("/api/admin/promo-codes/{promoId}/deactivate")
    public AdminPromoCode deactivate(@PathVariable UUID promoId) {
        return promos.deactivate(promoId);
    }
}
