package com.linkme.api.referral;

import com.linkme.api.auth.AppUser;
import com.linkme.api.referral.ReferralDtos.ReferralCodeInfo;
import com.linkme.api.referral.ReferralDtos.ReferralOverview;
import com.linkme.api.referral.ReferralDtos.Wallet;
import com.linkme.api.referral.ReferralDtos.WithdrawalRequest;
import com.linkme.api.referral.ReferralDtos.WithdrawalView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReferralController {
    private final ReferralService referrals;
    private final WalletService wallet;

    public ReferralController(ReferralService referrals, WalletService wallet) {
        this.referrals = referrals;
        this.wallet = wallet;
    }

    /** operationId: getReferralCode — public (inscription), limité en débit contre l'énumération. */
    @GetMapping("/api/auth/referral-codes/{code}")
    public ReferralCodeInfo code(@PathVariable String code) {
        return referrals.lookup(code);
    }

    /** operationId: getMyReferrals */
    @GetMapping("/api/me/referrals")
    public ReferralOverview mine(@AuthenticationPrincipal AppUser me) {
        return referrals.overview(me.id());
    }

    /** operationId: getMyWallet */
    @GetMapping("/api/me/wallet")
    public Wallet myWallet(@AuthenticationPrincipal AppUser me) {
        return wallet.wallet(me.id());
    }

    /** operationId: requestWithdrawal */
    @PostMapping("/api/me/wallet/withdrawals")
    @ResponseStatus(HttpStatus.CREATED)
    public WithdrawalView withdraw(@AuthenticationPrincipal AppUser me, @Valid @RequestBody WithdrawalRequest req) {
        return wallet.request(me.id(), req);
    }
}
