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
import com.linkme.api.referral.ReferralDtos.AdminReferrer;
import com.linkme.api.referral.ReferralDtos.Collab;
import com.linkme.api.referral.ReferralDtos.CollabRequest;
import com.linkme.api.referral.ReferralDtos.Referee;
import com.linkme.api.referral.ReferralDtos.ReferralCodeInfo;
import com.linkme.api.referral.ReferralDtos.ReferralEarningView;
import com.linkme.api.referral.ReferralDtos.ReferralOverview;
import com.linkme.api.referral.ReferralDtos.ReferralStats;
import com.linkme.api.subscription.SubscriptionPayment;
import com.linkme.api.subscription.SubscriptionPaymentRepository;
import com.linkme.api.subscription.SubscriptionPaymentStatus;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Parrainage à deux vitesses (D51–D54) : chaque paiement d'abonnement d'un filleul rapporte au parrain 20 % (taux de
 * base, libre-service) ou le taux « collab » négocié avec l'équipe (≤ 60 %) tant que la collab n'a pas expiré.
 * Le gain est gelé 7 jours (anti-fraude) avant d'être retirable depuis le portefeuille ({@link WalletService}).
 */
@Service
public class ReferralService {
    private static final Logger log = LoggerFactory.getLogger(ReferralService.class);
    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();
    static final int CODE_LENGTH = 8;

    private final ReferralAccountRepository accounts;
    private final ReferralRepository referrals;
    private final ReferralEarningRepository earnings;
    private final WalletEntryRepository wallet;
    private final WithdrawalRepository withdrawals;
    private final SubscriptionPaymentRepository subscriptionPayments;
    private final UserRepository users;
    private final CreatorProfileRepository profiles;
    private final AppProperties props;
    private final Clock clock;

    public ReferralService(ReferralAccountRepository accounts, ReferralRepository referrals, ReferralEarningRepository earnings,
                           WalletEntryRepository wallet, WithdrawalRepository withdrawals, SubscriptionPaymentRepository subscriptionPayments,
                           UserRepository users, CreatorProfileRepository profiles, AppProperties props, Clock clock) {
        this.accounts = accounts;
        this.referrals = referrals;
        this.earnings = earnings;
        this.wallet = wallet;
        this.withdrawals = withdrawals;
        this.subscriptionPayments = subscriptionPayments;
        this.users = users;
        this.profiles = profiles;
        this.props = props;
        this.clock = clock;
    }

    /** Empreinte IP salée par jour : permet « même IP, même jour » sans jamais stocker l'adresse (D54). */
    public static String signupIpHash(String ip, LocalDate day) {
        if (ip == null || ip.isBlank() || "unknown".equals(ip)) return null;
        return Hashing.sha256Hex("referral|" + ip + "|" + day);
    }

    static String normalizeCode(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
    }

    static boolean validCodeFormat(String code) {
        return code.length() == CODE_LENGTH && code.chars().allMatch(c -> new String(ALPHABET).indexOf(c) >= 0);
    }

    private static String newCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) sb.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        return sb.toString();
    }

    /** Compte de parrainage créé à la demande, avec un code unique (32^8 ≈ 10^12 combinaisons). */
    @Transactional
    public ReferralAccount getOrCreate(UUID userId) {
        Optional<ReferralAccount> existing = accounts.findById(userId);
        if (existing.isPresent()) return existing.get();
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = newCode();
            if (!accounts.existsByCode(code)) return accounts.saveAndFlush(new ReferralAccount(userId, code, clock.instant()));
        }
        throw new IllegalStateException("Impossible de générer un code de parrainage unique");
    }

    private Optional<ReferralAccount> activeReferrerByCode(String rawCode) {
        String code = normalizeCode(rawCode);
        if (!validCodeFormat(code)) return Optional.empty();
        return accounts.findByCode(code).filter(a -> users.findById(a.getUserId()).map(u -> u.getDeletedAt() == null).orElse(false));
    }

    @Transactional(readOnly = true)
    public ReferralCodeInfo lookup(String rawCode) {
        ReferralAccount a = activeReferrerByCode(rawCode).orElseThrow(ApiException::notFound);
        String name = profiles.findById(a.getUserId()).map(CreatorProfile::getDisplayName).orElseThrow(ApiException::notFound);
        return new ReferralCodeInfo(a.getCode(), name);
    }

    /** Rattachement à l'inscription (D53) : une seule fois, jamais à soi-même ; un code inconnu est ignoré. */
    @Transactional
    public void attachAtSignup(UUID refereeId, String rawCode, String signupIpHash) {
        if (rawCode == null || rawCode.isBlank()) return;
        Optional<ReferralAccount> referrer = activeReferrerByCode(rawCode);
        if (referrer.isEmpty() || referrer.get().getUserId().equals(refereeId) || referrals.existsById(refereeId)) return;
        referrals.save(new Referral(refereeId, referrer.get().getUserId(), signupIpHash, clock.instant()));
    }

    /** Crédit dans sa propre transaction (appelé après commit du paiement par {@link ReferralPaymentListener}). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean creditInNewTransaction(UUID subscriptionPaymentId) {
        return credit(subscriptionPaymentId);
    }

    /**
     * Crée le gain de parrainage d'un paiement d'abonnement PAYÉ, au plus une fois (unicité en base). Taux figé à la
     * date du paiement ; gain bloqué si le filleul a payé avec un numéro du parrain (auto-parrainage, D54).
     *
     * @return true si un gain a été créé
     */
    @Transactional
    public boolean credit(UUID subscriptionPaymentId) {
        SubscriptionPayment payment = subscriptionPayments.findById(subscriptionPaymentId).orElse(null);
        if (payment == null || payment.getStatus() != SubscriptionPaymentStatus.PAID || payment.getPaidAt() == null) return false;
        if (payment.getAmountXof() <= 0) return false; // abonnement offert (code promo 100 %) : rien à partager
        Referral referral = referrals.findById(payment.getCreatorId()).orElse(null);
        if (referral == null || earnings.existsBySubscriptionPaymentId(payment.getId())) return false;
        User referrer = users.findById(referral.getReferrerId()).orElse(null);
        if (referrer == null || referrer.getDeletedAt() != null) return false;

        Instant now = clock.instant();
        ReferralAccount account = getOrCreate(referrer.getId());
        int rate = account.effectiveRateBps(props.referral().baseRateBps(), payment.getPaidAt());
        String blocked = isReferrerPhone(referrer, payment.buyerPhone()) ? ReferralEarning.SELF_PAYMENT : null;
        Instant availableAt = payment.getPaidAt().plus(Duration.ofDays(props.referral().holdDays()));
        ReferralEarning earning = earnings.saveAndFlush(new ReferralEarning(referrer.getId(), payment.getCreatorId(), payment.getId(),
                payment.getAmountXof(), rate, blocked, availableAt, now));
        if (blocked == null && earning.getAmountXof() > 0) wallet.save(WalletEntry.earning(earning, now));
        if (blocked != null) log.warn("Parrainage : gain bloqué (auto-parrainage) paiement={} parrain={}", payment.getReference(), referrer.getId());
        return true;
    }

    /** Le numéro qui a payé est-il un numéro connu du parrain (compte, ses propres abonnements, ses retraits) ? */
    private boolean isReferrerPhone(User referrer, String payerPhone) {
        if (payerPhone == null || payerPhone.isBlank()) return false;
        String phone = Phones.normalize(payerPhone);
        if (referrer.getPhone() != null && Phones.normalize(referrer.getPhone()).equals(phone)) return true;
        return subscriptionPayments.existsByCreatorIdAndPayerPhone(referrer.getId(), phone) || withdrawals.existsByUserIdAndPhone(referrer.getId(), phone);
    }

    /** Filet de sécurité quotidien : paiements PAID des 35 derniers jours restés sans gain (écouteur en échec). */
    @Scheduled(cron = "0 20 0 * * *")
    @Transactional
    public int reconcile() {
        List<UUID> missing = subscriptionPayments.findPaidWithoutReferralEarning(SubscriptionPaymentStatus.PAID,
                clock.instant().minus(Duration.ofDays(35)));
        int created = 0;
        for (UUID id : missing) if (credit(id)) created++;
        if (created > 0) log.info("Parrainage : {} gain(s) rattrapé(s).", created);
        return created;
    }

    // ───────────────────────────── Vue créateur

    @Transactional
    public ReferralOverview overview(UUID userId) {
        ReferralAccount account = getOrCreate(userId);
        Instant now = clock.instant();
        int base = props.referral().baseRateBps();
        int effective = account.effectiveRateBps(base, now);

        List<Referral> refs = referrals.findByReferrerIdOrderByCreatedAtDesc(userId);
        List<UUID> ids = refs.stream().map(Referral::getRefereeId).toList();
        Map<UUID, CreatorProfile> profileById = profiles.findAllById(ids).stream().collect(Collectors.toMap(CreatorProfile::getUserId, Function.identity()));
        Map<UUID, User> userById = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<ReferralEarning> all = earnings.findByReferrerId(userId);
        Map<UUID, Long> earnedByReferee = new HashMap<>();
        for (ReferralEarning e : all) if (!e.isBlocked()) earnedByReferee.merge(e.getRefereeId(), e.getAmountXof(), Long::sum);

        int active = 0;
        long currentMonthly = 0;
        long potentialMonthly = 0;
        List<Referee> referees = new java.util.ArrayList<>();
        for (Referral r : refs) {
            CreatorProfile p = profileById.get(r.getRefereeId());
            User u = userById.get(r.getRefereeId());
            String status = refereeStatus(p);
            long perPeriod = ReferralEarning.commission(props.subscription().priceFor(p == null ? "standard" : p.getPlan()), effective);
            boolean deleted = u == null || u.getDeletedAt() != null;
            if ("active".equals(status)) {
                active++;
                currentMonthly += perPeriod;
            } else if (!deleted) {
                potentialMonthly += perPeriod;
            }
            referees.add(new Referee(Masking.name(p == null ? null : p.getDisplayName()), u == null ? null : Masking.phone(u.getPhone()),
                    r.getCreatedAt(), status, earnedByReferee.getOrDefault(r.getRefereeId(), 0L)));
        }
        Map<UUID, String> maskedNames = new HashMap<>();
        profileById.forEach((id, p) -> maskedNames.put(id, Masking.name(p.getDisplayName())));
        List<ReferralEarningView> recent = earnings.findByReferrerIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 20)).stream()
                .map(e -> toView(e, maskedNames.getOrDefault(e.getRefereeId(), "***"), now)).toList();

        ReferralStats stats = new ReferralStats(refs.size(), active, earnings.sumCredited(userId), currentMonthly, potentialMonthly);
        return new ReferralOverview(account.getCode(), props.baseUrl() + "/r/" + account.getCode(), base, effective, collabOf(account, now),
                stats, referees, recent);
    }

    static String refereeStatus(CreatorProfile p) {
        if (p == null) return "registered";
        return switch (p.getSubscriptionStatus()) {
            case "active" -> "active";
            case "expired" -> "expired";
            default -> "registered";
        };
    }

    static ReferralEarningView toView(ReferralEarning e, String maskedName, Instant now) {
        String status = e.isBlocked() ? "blocked" : e.getAvailableAt().isAfter(now) ? "held" : "available";
        return new ReferralEarningView(e.getId(), e.getCreatedAt(), maskedName, e.getBaseAmountXof(), e.getRateBps(), e.getAmountXof(), status,
                e.getAvailableAt(), e.getBlockedReason());
    }

    private static Collab collabOf(ReferralAccount a, Instant now) {
        return a.collabActive(now) ? new Collab(a.getCollabRateBps(), a.getCollabExpiresAt()) : null;
    }

    // ───────────────────────────── Admin : collabs négociées (D52)

    @Transactional
    public AdminReferrer adminReferrer(String handle) {
        CreatorProfile p = profiles.findByHandle(handle == null ? "" : handle.trim().toLowerCase(Locale.ROOT)).orElseThrow(ApiException::notFound);
        return toAdmin(p, getOrCreate(p.getUserId()));
    }

    @Transactional
    public AdminReferrer setCollab(String handle, CollabRequest req) {
        CreatorProfile p = profiles.findByHandle(handle == null ? "" : handle.trim().toLowerCase(Locale.ROOT)).orElseThrow(ApiException::notFound);
        Instant now = clock.instant();
        if (req.rateBps() > props.referral().maxCollabRateBps() || req.rateBps() < props.referral().baseRateBps())
            throw ApiException.validation("rateBps", "Le taux collab doit être compris entre 20 % et 60 %.");
        if (!req.expiresAt().isAfter(now)) throw ApiException.validation("expiresAt", "La date d'expiration doit être dans le futur.");
        ReferralAccount a = getOrCreate(p.getUserId());
        a.startCollab(req.rateBps(), req.expiresAt(), now);
        return toAdmin(p, a);
    }

    @Transactional
    public AdminReferrer endCollab(String handle) {
        CreatorProfile p = profiles.findByHandle(handle == null ? "" : handle.trim().toLowerCase(Locale.ROOT)).orElseThrow(ApiException::notFound);
        ReferralAccount a = getOrCreate(p.getUserId());
        a.endCollab(clock.instant());
        return toAdmin(p, a);
    }

    private AdminReferrer toAdmin(CreatorProfile p, ReferralAccount a) {
        Instant now = clock.instant();
        int base = props.referral().baseRateBps();
        List<Referral> refs = referrals.findByReferrerIdOrderByCreatedAtDesc(p.getUserId());
        int active = (int) profiles.findAllById(refs.stream().map(Referral::getRefereeId).toList()).stream()
                .filter(x -> "active".equals(x.getSubscriptionStatus())).count();
        return new AdminReferrer(p.getUserId(), p.getHandle(), p.getDisplayName(), a.getCode(), base, a.effectiveRateBps(base, now),
                collabOf(a, now), refs.size(), active, earnings.sumCredited(p.getUserId()));
    }

    /** Liste des collabs (D64) : en cours d'abord (échéance la plus proche en tête), puis expirées. */
    @Transactional(readOnly = true)
    public List<ReferralDtos.AdminCollab> adminCollabs() {
        Instant now = clock.instant();
        List<ReferralAccount> accs = accounts.findByCollabRateBpsIsNotNullOrderByCollabExpiresAtDesc();
        Map<UUID, CreatorProfile> byId = profiles.findAllById(accs.stream().map(ReferralAccount::getUserId).toList()).stream()
                .collect(Collectors.toMap(CreatorProfile::getUserId, Function.identity()));
        List<ReferralDtos.AdminCollab> out = new java.util.ArrayList<>();
        for (ReferralAccount a : accs) {
            CreatorProfile p = byId.get(a.getUserId());
            if (p == null) continue;
            List<Referral> refs = referrals.findByReferrerIdOrderByCreatedAtDesc(a.getUserId());
            int active = (int) profiles.findAllById(refs.stream().map(Referral::getRefereeId).toList()).stream()
                    .filter(x -> "active".equals(x.getSubscriptionStatus())).count();
            out.add(new ReferralDtos.AdminCollab(a.getUserId(), p.getHandle(), p.getDisplayName(), a.getCollabRateBps(), a.getCollabExpiresAt(),
                    a.collabActive(now), refs.size(), active, earnings.sumCredited(a.getUserId())));
        }
        out.sort(ReferralService::collabOrder);
        return out;
    }

    /** En cours d'abord, échéance la plus proche en tête ; puis expirées, la plus récente en tête. */
    static int collabOrder(ReferralDtos.AdminCollab x, ReferralDtos.AdminCollab y) {
        if (x.active() != y.active()) return x.active() ? -1 : 1;
        return x.active() ? x.expiresAt().compareTo(y.expiresAt()) : y.expiresAt().compareTo(x.expiresAt());
    }

    /** Signaux affichés à l'admin à côté d'une demande de retrait (D54). */
    @Transactional(readOnly = true)
    public ReferralDtos.FraudSignals signals(UUID referrerId) {
        List<Referral> refs = referrals.findByReferrerIdOrderByCreatedAtDesc(referrerId);
        int active = (int) profiles.findAllById(refs.stream().map(Referral::getRefereeId).toList()).stream()
                .filter(x -> "active".equals(x.getSubscriptionStatus())).count();
        return new ReferralDtos.FraudSignals(earnings.countByReferrerIdAndBlockedReasonIsNotNull(referrerId),
                referrals.countSameDayIpReferrals(referrerId), refs.size(), active);
    }
}
