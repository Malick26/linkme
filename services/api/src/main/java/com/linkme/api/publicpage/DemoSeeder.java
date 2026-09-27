package com.linkme.api.publicpage;

import com.linkme.api.auth.User;
import com.linkme.api.auth.UserRepository;
import com.linkme.api.blocks.Block;
import com.linkme.api.blocks.BlockItem;
import com.linkme.api.blocks.BlockItemRepository;
import com.linkme.api.blocks.BlockRepository;
import com.linkme.api.config.AppProperties;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.profile.ProfileStats;
import com.linkme.api.profile.ProfileStatsRepository;
import com.linkme.api.profile.SocialAccount;
import com.linkme.api.profile.SocialAccountRepository;
import com.linkme.api.shop.Product;
import com.linkme.api.shop.ProductRepository;
import com.linkme.api.theme.ThemeConfig;
import com.linkme.api.theme.ThemePresets;
import com.linkme.api.theme.ThemeService;
import com.linkme.api.uploads.Asset;
import com.linkme.api.uploads.AssetService;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seed de démonstration « Malick Wane » (brief annexe A) sur /malick — activé par SEED_DEMO=true (profil dev).
 * Images : placeholders générés (D14). Idempotent.
 */
@Component
public class DemoSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);
    public static final String HANDLE = "malick";

    private final AppProperties props;
    private final UserRepository users;
    private final CreatorProfileRepository profiles;
    private final ProfileStatsRepository stats;
    private final SocialAccountRepository socials;
    private final BlockRepository blocks;
    private final BlockItemRepository items;
    private final ProductRepository products;
    private final AssetService assets;
    private final ThemeService themes;
    private final ThemePresets presets;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final String demoPassword;

    public DemoSeeder(AppProperties props, UserRepository users, CreatorProfileRepository profiles, ProfileStatsRepository stats,
                      SocialAccountRepository socials, BlockRepository blocks, BlockItemRepository items, ProductRepository products,
                      AssetService assets, ThemeService themes, ThemePresets presets, PasswordEncoder encoder, Clock clock,
                      @Value("${DEMO_PASSWORD:demo-malick-2026}") String demoPassword) {
        this.props = props;
        this.users = users;
        this.profiles = profiles;
        this.stats = stats;
        this.socials = socials;
        this.blocks = blocks;
        this.items = items;
        this.products = products;
        this.assets = assets;
        this.themes = themes;
        this.presets = presets;
        this.encoder = encoder;
        this.clock = clock;
        this.demoPassword = demoPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.seedDemo() || profiles.existsByHandle(HANDLE)) return;
        Instant now = clock.instant();
        User u = users.save(new User(UUID.randomUUID(), "malick@demo.linkme.sn", encoder.encode(demoPassword), now));
        UUID id = u.getId();
        Asset bg = assets.save(id, "seed", "bg-sunset", "background", 2400, 2400, "webp", null, null);
        Map<String, Asset> thumbs = new HashMap<>();
        for (String k : List.of("travel", "shop", "music", "content", "contact")) {
            thumbs.put(k, assets.save(id, "seed", "thumb-" + k, "thumbnail", 480, 368, "webp", null, null));
        }

        CreatorProfile p = new CreatorProfile(id, HANDLE, "Malick Wane", now);
        p.update("Malick Wane", List.of("Big dreams", "Good energy", "Real progress."), List.of("Travel", "Lifestyle", "Creator"),
                "Des villes, des gens, des histoires.\nEt encore tellement à vivre…", bg.getId(), now);
        p.setOnboardingCompleted(true, now);
        p.setPublished(true, now);
        // Démo = référence de design, pas un compte payant réel : abonnement Boutique actif de façon durable (D44/D45).
        p.activateSubscription("boutique", 3650, now);
        profiles.save(p);

        ProfileStats s = new ProfileStats(id);
        s.update(245_000, 8_400_000, 12_000_000, now);
        stats.save(s);

        int pos = 0;
        for (Object[] row : new Object[][] {
                {"tiktok", "https://www.tiktok.com/@malick", 245_000L}, {"instagram", "https://www.instagram.com/malick", 180_000L},
                {"youtube", "https://www.youtube.com/@malick", 94_000L}, {"snapchat", "https://www.snapchat.com/add/malick", 52_000L},
                {"x", "https://x.com/malick", 32_000L}}) {
            socials.save(new SocialAccount(id, (String) row[0], (String) row[1], (Long) row[2], pos++, now));
        }

        Object[][] defs = {
                {"travel", "voyages", "Mes voyages", "Découvre mes dernières aventures", "plane"},
                {"shop", "shop", "Mon shop", "Mes outfits & mes coups de cœur", "shopping-bag"},
                {"music", "sons", "Mes sons", "Playlists, recommandations, vibes", "music"},
                {"content", "contenus", "Mes contenus", "Vlogs, behind the scenes, projets", "clapperboard"},
                {"contact", "contact", "Me contacter", "Projets, collabs, opportunités", "mail"}};
        Map<String, Block> byType = new HashMap<>();
        pos = 0;
        for (Object[] d : defs) {
            Block b = new Block(id, (String) d[0], (String) d[1], pos++, now);
            Map<String, Object> config = new HashMap<>();
            if ("contact".equals(d[0])) {
                config.put("whatsapp", "+221770000000");
                config.put("email", "contact@example.com");
            }
            b.update((String) d[2], (String) d[3], (String) d[4], thumbs.get((String) d[0]).getId(), null, null, true, config, now);
            byType.put((String) d[0], blocks.save(b));
        }
        item(byType.get("travel"), 0, "Saint-Louis, la ville aux mille couleurs", "Balade sur le pont Faidherbe et coucher de soleil sur le fleuve.", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbs.get("travel"));
        item(byType.get("travel"), 1, "Road trip au Sine-Saloum", "Trois jours entre bolongs, mangroves et pirogues.", null, thumbs.get("travel"));
        item(byType.get("music"), 0, "Ma playlist road trip", "Afrobeats, mbalax et un peu d'amapiano.", "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", thumbs.get("music"));
        item(byType.get("content"), 0, "Vlog — une journée à Dakar", "Behind the scenes de mon dernier tournage.", "https://www.youtube.com/watch?v=aqz-KE-bpKQ", thumbs.get("content"));

        Product hoodie = new Product(id, now);
        hoodie.update("Hoodie « Real progress »", 15_000, "Coton épais, brodé. Tailles S à XL.", 25, true, List.of(thumbs.get("shop").getId().toString()), now);
        products.save(hoodie);
        Product preset = new Product(id, now.plusMillis(1));
        preset.update("Preset photo « Sunset »", 5_000, "Mes réglages Lightroom pour des couchers de soleil dorés.", null, true,
                List.of(thumbs.get("content").getId().toString()), now);
        products.save(preset);

        ThemeConfig theme = presets.get("sunset");
        themes.saveDraft(id, theme.withBackground(theme.background().withImageId(bg.getId().toString())));
        themes.publish(id);
        log.info("Seed de démonstration créé : /{} (connexion : malick@demo.linkme.sn)", HANDLE);
    }

    private void item(Block b, int pos, String title, String desc, String url, Asset img) {
        BlockItem i = new BlockItem(b.getId(), pos);
        i.update(title, desc, url, img == null ? null : img.getId(), null);
        items.save(i);
    }
}
