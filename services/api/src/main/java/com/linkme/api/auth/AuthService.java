package com.linkme.api.auth;

import com.linkme.api.auth.AuthDtos.HandleAvailability;
import com.linkme.api.auth.AuthDtos.Me;
import com.linkme.api.auth.AuthDtos.RegisterRequest;
import com.linkme.api.blocks.BlockRepository;
import com.linkme.api.blocks.BlockService;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.Hashing;
import com.linkme.api.config.AppProperties;
import com.linkme.api.mail.MailService;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.profile.ProfileStats;
import com.linkme.api.profile.ProfileStatsRepository;
import com.linkme.api.profile.SocialAccountRepository;
import com.linkme.api.shop.OrderRepository;
import com.linkme.api.shop.ProductRepository;
import com.linkme.api.theme.ThemeRepository;
import com.linkme.api.theme.ThemeService;
import com.linkme.api.uploads.AssetRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final CreatorProfileRepository profiles;
    private final ProfileStatsRepository stats;
    private final SocialAccountRepository socials;
    private final BlockService blockService;
    private final BlockRepository blocks;
    private final ThemeService themes;
    private final ThemeRepository themeRepo;
    private final AssetRepository assets;
    private final ProductRepository products;
    private final OrderRepository orders;
    private final PasswordResetTokenRepository resetTokens;
    private final PasswordEncoder encoder;
    private final MailService mail;
    private final AppProperties props;
    private final Clock clock;

    public AuthService(UserRepository users, CreatorProfileRepository profiles, ProfileStatsRepository stats, SocialAccountRepository socials,
                       BlockService blockService, BlockRepository blocks, ThemeService themes, ThemeRepository themeRepo, AssetRepository assets,
                       ProductRepository products, OrderRepository orders, PasswordResetTokenRepository resetTokens, PasswordEncoder encoder,
                       MailService mail, AppProperties props, Clock clock) {
        this.users = users;
        this.profiles = profiles;
        this.stats = stats;
        this.socials = socials;
        this.blockService = blockService;
        this.blocks = blocks;
        this.themes = themes;
        this.themeRepo = themeRepo;
        this.assets = assets;
        this.products = products;
        this.orders = orders;
        this.resetTokens = resetTokens;
        this.encoder = encoder;
        this.mail = mail;
        this.props = props;
        this.clock = clock;
    }

    public HandleAvailability availability(String raw) {
        String h = Handles.normalize(raw);
        if (!Handles.validFormat(h)) return new HandleAvailability(h, false, "invalid");
        if (Handles.reserved(h)) return new HandleAvailability(h, false, "reserved");
        if (profiles.existsByHandle(h)) return new HandleAvailability(h, false, "taken");
        return new HandleAvailability(h, true, null);
    }

    /** Inscription : compte + profil + stats + thème Sunset + 5 blocs par défaut (onboarding en < 15 min). */
    @Transactional
    public User register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        String handle = Handles.normalize(req.handle());
        if (!Handles.validFormat(handle)) throw ApiException.validation("handle", "3 à 30 caractères : lettres minuscules, chiffres, . _ -");
        if (Handles.reserved(handle)) throw ApiException.conflict("HANDLE_RESERVED", "Ce nom d'utilisateur est réservé.");
        if (profiles.existsByHandle(handle)) throw ApiException.conflict("HANDLE_TAKEN", "Ce nom d'utilisateur est déjà pris.");
        if (users.findActiveByEmail(email).isPresent()) throw ApiException.conflict("EMAIL_TAKEN", "Un compte existe déjà avec cet email.");
        Instant now = clock.instant();
        User u = new User(UUID.randomUUID(), email, encoder.encode(req.password()), now);
        try {
            users.saveAndFlush(u);
            profiles.saveAndFlush(new CreatorProfile(u.getId(), handle, req.displayName().trim(), now));
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("HANDLE_TAKEN", "Ce nom d'utilisateur est déjà pris.");
        }
        stats.save(new ProfileStats(u.getId()));
        themes.getOrCreate(u.getId());
        blockService.createDefaults(u.getId());
        return u;
    }

    @Transactional(readOnly = true)
    public Me me(UUID userId) {
        User u = users.findById(userId).filter(x -> x.getDeletedAt() == null).orElseThrow(() -> ApiException.unauthorized("UNAUTHORIZED", "Session expirée."));
        CreatorProfile p = profiles.findById(userId).orElseThrow(ApiException::notFound);
        return new Me(u.getId(), u.getEmail(), p.getHandle(), p.getDisplayName(), p.getPlan(), p.isPublished(), p.isOnboardingCompleted());
    }

    /** Réponse identique que le compte existe ou non (pas d'énumération d'emails). */
    @Transactional
    public void forgot(String email) {
        users.findActiveByEmail(email.trim()).ifPresent(u -> {
            String token = Hashing.randomToken(32);
            resetTokens.save(new PasswordResetToken(u.getId(), Hashing.sha256Hex(token), clock.instant().plus(Duration.ofHours(1))));
            mail.send(u.getEmail(), "Réinitialise ton mot de passe",
                    "Pour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n" + props.baseUrl() + "/reset?token=" + token
                            + "\n\nSi tu n'es pas à l'origine de cette demande, ignore cet email.");
        });
    }

    @Transactional
    public void reset(String token, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken t = resetTokens.findByTokenHash(Hashing.sha256Hex(token))
                .filter(x -> x.usable(now))
                .orElseThrow(() -> ApiException.badRequest("TOKEN_INVALID", "Ce lien a expiré ou a déjà été utilisé."));
        t.use(now);
        // tous les autres jetons du compte deviennent inutilisables
        resetTokens.markAllUsed(t.getUserId(), now);
        users.findById(t.getUserId()).orElseThrow(ApiException::notFound).changePassword(encoder.encode(newPassword), now);
    }

    /**
     * Suppression de compte (loi 2008-12) : contenus, réseaux, thème, images et produits supprimés ; commandes conservées
     * (obligations comptables) mais données acheteurs anonymisées ; handle libéré ; email anonymisé.
     */
    @Transactional
    public void deleteAccount(UUID userId, String password) {
        User u = users.findById(userId).orElseThrow(ApiException::notFound);
        if (!encoder.matches(password, u.getPasswordHash())) throw ApiException.unauthorized("BAD_CREDENTIALS", "Mot de passe incorrect.");
        Instant now = clock.instant();
        blocks.deleteAllByCreator(userId);
        socials.deleteAllByCreator(userId);
        themeRepo.deleteById(userId);
        products.findLive(userId).forEach(p -> p.softDelete(now));
        orders.findByCreatorId(userId).forEach(o -> o.anonymizeBuyer(now));
        profiles.findById(userId).ifPresent(p -> p.anonymize(now));
        stats.findById(userId).ifPresent(s -> s.update(0, 0, 0, now));
        u.markDeleted(now);
        users.flush();
        profiles.flush();
        assets.deleteAllByOwner(userId);
    }
}
