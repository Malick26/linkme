package com.linkme.api.referral;

import com.linkme.api.auth.User;
import com.linkme.api.auth.UserRepository;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.common.Masking;
import com.linkme.api.common.Phones;
import com.linkme.api.config.AppProperties;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.referral.ReferralDtos.AdminCreator;
import com.linkme.api.referral.ReferralDtos.AdminWithdrawal;
import com.linkme.api.referral.ReferralDtos.Wallet;
import com.linkme.api.referral.ReferralDtos.WithdrawalDecision;
import com.linkme.api.referral.ReferralDtos.WithdrawalRequest;
import com.linkme.api.referral.ReferralDtos.WithdrawalView;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Portefeuille du créateur (D55) et retraits à décaissement manuel (D56). Le solde est calculé à partir du grand
 * livre append-only {@code wallet_entry} ; une demande de retrait réserve immédiatement le montant, un refus le
 * recrédite, un paiement (fait à la main par l'équipe via Wave/Orange Money/Free Money) clôt la demande.
 */
@Service
public class WalletService {
    private final WalletEntryRepository wallet;
    private final WithdrawalRepository withdrawals;
    private final ReferralEarningRepository earnings;
    private final ReferralAccountRepository accounts;
    private final ReferralService referrals;
    private final UserRepository users;
    private final CreatorProfileRepository profiles;
    private final ApplicationEventPublisher publisher;
    private final AppProperties props;
    private final Clock clock;

    public WalletService(WalletEntryRepository wallet, WithdrawalRepository withdrawals, ReferralEarningRepository earnings,
                         ReferralAccountRepository accounts, ReferralService referrals, UserRepository users, CreatorProfileRepository profiles,
                         ApplicationEventPublisher publisher, AppProperties props, Clock clock) {
        this.wallet = wallet;
        this.withdrawals = withdrawals;
        this.earnings = earnings;
        this.accounts = accounts;
        this.referrals = referrals;
        this.users = users;
        this.profiles = profiles;
        this.publisher = publisher;
        this.props = props;
        this.clock = clock;
    }

    /** Événements pour les emails (envoyés après commit, {@link WalletEmails}). */
    public record WithdrawalRequested(UUID withdrawalId) {}

    public record WithdrawalDecided(UUID withdrawalId) {}

    @Transactional(readOnly = true)
    public Wallet wallet(UUID userId) {
        Instant now = clock.instant();
        List<WithdrawalView> recent = withdrawals.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 20)).stream()
                .map(WalletService::toView).toList();
        return new Wallet(
                wallet.availableBalance(userId, now),
                wallet.heldBalance(userId, now),
                withdrawals.sumByStatus(userId, WithdrawalStatus.REQUESTED),
                earnings.sumCredited(userId),
                withdrawals.sumByStatus(userId, WithdrawalStatus.PAID),
                props.referral().minWithdrawalXof(),
                props.referral().holdDays(),
                wallet.nextRelease(userId, now),
                recent);
    }

    static WithdrawalView toView(Withdrawal w) {
        return new WithdrawalView(w.getId(), w.getAmountXof(), w.getMethod(), Masking.phone(w.getPhone()), w.getStatus(), w.getCreatedAt(),
                w.getProcessedAt(), w.getStatus() == WithdrawalStatus.REJECTED ? w.getNote() : null);
    }

    @Transactional
    public WithdrawalView request(UUID userId, WithdrawalRequest req) {
        String phone = Phones.normalize(req.phone());
        if (!Phones.isValid(phone)) throw ApiException.validation("phone", "Numéro de téléphone invalide.");
        long min = props.referral().minWithdrawalXof();
        if (req.amountXof() < min)
            throw ApiException.validation("amountXof", "Le retrait minimum est de " + String.format("%,d", min).replace(',', ' ') + " FCFA.");

        // même règle que les checkouts : la clé est liée au numéro, un tiers ne peut pas rejouer celle d'un autre
        String idem = req.idempotencyKey() == null || req.idempotencyKey().isBlank() ? null
                : Hashing.sha256Hex(req.idempotencyKey().trim() + "|" + phone).substring(0, 64);
        if (idem != null) {
            Optional<Withdrawal> existing = withdrawals.findByUserIdAndIdempotencyKey(userId, idem);
            if (existing.isPresent()) return toView(existing.get());
        }

        // verrou par créateur : deux demandes simultanées ne peuvent pas dépenser deux fois le même solde
        referrals.getOrCreate(userId);
        accounts.lock(userId).orElseThrow(ApiException::notFound);
        if (withdrawals.existsByUserIdAndStatus(userId, WithdrawalStatus.REQUESTED))
            throw ApiException.conflict("WITHDRAWAL_PENDING", "Une demande de retrait est déjà en cours de traitement.");
        Instant now = clock.instant();
        long available = wallet.availableBalance(userId, now);
        if (req.amountXof() > available)
            throw ApiException.conflict("INSUFFICIENT_BALANCE", "Solde retirable insuffisant.");

        Withdrawal w = withdrawals.saveAndFlush(new Withdrawal(userId, req.amountXof(), req.method(), phone, idem, now));
        wallet.save(WalletEntry.withdrawal(w, now));
        publisher.publishEvent(new WithdrawalRequested(w.getId()));
        return toView(w);
    }

    // ───────────────────────────── Admin (D56)

    @Transactional(readOnly = true)
    public List<AdminWithdrawal> adminList(WithdrawalStatus status) {
        List<Withdrawal> list = status == null
                ? withdrawals.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 200))
                : withdrawals.findByStatusOrderByCreatedAtAsc(status, PageRequest.of(0, 200));
        return list.stream().map(this::toAdmin).toList();
    }

    @Transactional
    public AdminWithdrawal markPaid(UUID adminId, UUID withdrawalId, WithdrawalDecision d) {
        Withdrawal w = withdrawals.lock(withdrawalId).orElseThrow(ApiException::notFound);
        if (!w.decide(WithdrawalStatus.PAID, adminId, blankToNull(d.providerRef()), blankToNull(d.note()), clock.instant()))
            throw ApiException.conflict("WITHDRAWAL_FINAL", "Cette demande a déjà été traitée.");
        publisher.publishEvent(new WithdrawalDecided(w.getId()));
        return toAdmin(w);
    }

    @Transactional
    public AdminWithdrawal reject(UUID adminId, UUID withdrawalId, WithdrawalDecision d) {
        String note = blankToNull(d.note());
        if (note == null) throw ApiException.validation("note", "Indique le motif du refus (il sera visible par le créateur).");
        Withdrawal w = withdrawals.lock(withdrawalId).orElseThrow(ApiException::notFound);
        Instant now = clock.instant();
        if (!w.decide(WithdrawalStatus.REJECTED, adminId, null, note, now))
            throw ApiException.conflict("WITHDRAWAL_FINAL", "Cette demande a déjà été traitée.");
        wallet.save(WalletEntry.reversal(w, now));
        publisher.publishEvent(new WithdrawalDecided(w.getId()));
        return toAdmin(w);
    }

    private AdminWithdrawal toAdmin(Withdrawal w) {
        User u = users.findById(w.getUserId()).orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Compte introuvable."));
        CreatorProfile p = profiles.findById(w.getUserId()).orElse(null);
        AdminCreator creator = new AdminCreator(u.getId(), p == null ? "" : p.getHandle(), p == null ? "" : p.getDisplayName(), u.getEmail());
        return new AdminWithdrawal(w.getId(), w.getAmountXof(), w.getMethod(), w.getPhone(), w.getStatus(), w.getCreatedAt(), w.getProcessedAt(),
                w.getProviderRef(), w.getNote(), creator, referrals.signals(w.getUserId()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
