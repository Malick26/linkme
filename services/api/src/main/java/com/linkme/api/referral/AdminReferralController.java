package com.linkme.api.referral;

import com.linkme.api.auth.AppUser;
import com.linkme.api.referral.ReferralDtos.AdminReferrer;
import com.linkme.api.referral.ReferralDtos.AdminWithdrawal;
import com.linkme.api.referral.ReferralDtos.CollabRequest;
import com.linkme.api.referral.ReferralDtos.WithdrawalDecision;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Espace admin minimal (D56) : réservé à ROLE_ADMIN par {@code SecurityConfig} ({@code /api/admin/**}). */
@RestController
public class AdminReferralController {
    private final WalletService wallet;
    private final ReferralService referrals;

    public AdminReferralController(WalletService wallet, ReferralService referrals) {
        this.wallet = wallet;
        this.referrals = referrals;
    }

    /** operationId: adminListWithdrawals */
    @GetMapping("/api/admin/withdrawals")
    public List<AdminWithdrawal> list(@RequestParam(required = false) WithdrawalStatus status) {
        return wallet.adminList(status);
    }

    /** operationId: adminMarkWithdrawalPaid */
    @PostMapping("/api/admin/withdrawals/{withdrawalId}/pay")
    public AdminWithdrawal pay(@AuthenticationPrincipal AppUser admin, @PathVariable UUID withdrawalId, @Valid @RequestBody WithdrawalDecision d) {
        return wallet.markPaid(admin.id(), withdrawalId, d);
    }

    /** operationId: adminRejectWithdrawal */
    @PostMapping("/api/admin/withdrawals/{withdrawalId}/reject")
    public AdminWithdrawal reject(@AuthenticationPrincipal AppUser admin, @PathVariable UUID withdrawalId, @Valid @RequestBody WithdrawalDecision d) {
        return wallet.reject(admin.id(), withdrawalId, d);
    }

    /** operationId: adminListCollabs */
    @GetMapping("/api/admin/collabs")
    public List<ReferralDtos.AdminCollab> collabs() {
        return referrals.adminCollabs();
    }

    /** operationId: adminGetReferrer */
    @GetMapping("/api/admin/referrers/{handle}")
    public AdminReferrer referrer(@PathVariable String handle) {
        return referrals.adminReferrer(handle);
    }

    /** operationId: adminSetCollab */
    @PutMapping("/api/admin/referrers/{handle}/collab")
    public AdminReferrer setCollab(@PathVariable String handle, @Valid @RequestBody CollabRequest req) {
        return referrals.setCollab(handle, req);
    }

    /** operationId: adminEndCollab */
    @DeleteMapping("/api/admin/referrers/{handle}/collab")
    public AdminReferrer endCollab(@PathVariable String handle) {
        return referrals.endCollab(handle);
    }
}
